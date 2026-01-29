import asyncio
import platform
import sys
import re
import os
import json
import datetime
import glob
import threading
import random
from zoneinfo import ZoneInfo

import httpx
from dotenv import load_dotenv
from bleak import BleakScanner

from config import APP_SERVICE_UUID, RSSI_THRESHOLD, SCAN_INTERVAL

# Serbian timezone
SERBIAN_TZ = ZoneInfo("Europe/Belgrade")

# .env fájl betöltése
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Nincs SUPABASE_URL vagy SUPABASE_SERVICE_KEY a .env-ben!")
    sys.exit(1)

# UUID: kisbetűs normalizálás Linux/BlueZ kompatibilitáshoz
APP_SERVICE_UUID_NORMALIZED = APP_SERVICE_UUID.lower()

# Már feldolgozott app-eszközök MAC címei (duplikált találatok elkerülése)
processed_macs = set()
found_students = 0

# Indexszám minta (8 számjegy)
INDEX_NUMBER_REGEX = re.compile(r"^[0-9]{8}$")

# Session fájl elérési útja
SESSION_FILE = "current_session.json"
ACCEPTED_STUDENTS_FILE = "accepted_students.json"

def fetch_raspberry_device_ids() -> list[int]:
    """# Lekéri az összes ID-t a public.raspberry_devices táblából."""
    url = f"{SUPABASE_URL}/rest/v1/raspberry_devices"  # Meghívjuk a táblát
    headers = {
        "apikey": SUPABASE_KEY,                      # Supabase kulcs beállítása
        "Authorization": f"Bearer {SUPABASE_KEY}"    # Auth header küldése
    }
    params = {"select": "id"}                        # Csak az ID-kat kérjük
    try:
        resp = httpx.get(url, headers=headers, params=params, timeout=10)  # GET kérés küldése
        resp.raise_for_status()                      # Hibát dob, ha nem 2xx
        data = resp.json()                           # JSON válasz feldolgozása
        return [row["id"] for row in data]           # ID-k listájának visszaadása
    except Exception as e:
        print(f"[ERROR] raspberry_devices ID-k lekérése sikertelen: {e}")  # Hiba logolása
        return []  

RASPBERRY_DEVICE_RANDOM_ID = None
ids = fetch_raspberry_device_ids()
if ids:
    print(f"[INFO] Raspberry eszköz azonosítók: {ids}")
    RASPBERRY_DEVICE_RANDOM_ID = random.choice(ids)
print(f"[INFO] Raspberry eszköz azonosító kiválasztva: {RASPBERRY_DEVICE_RANDOM_ID}")

# ============================================
# Session kezelés
# ============================================

def get_active_course_id() -> int | None:
    """
    Aktív óra azonosító beolvasása a session fájlból.
    None-t ad vissza, ha nincs aktív óra.
    """
    if not os.path.exists(SESSION_FILE):
        return None
    
    try:
        with open(SESSION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("active_course_id")
    except (json.JSONDecodeError, IOError, KeyError) as e:
        print(f"[WARN] Session fájl olvasási hiba: {e}")
        return None


def load_accepted_students() -> list[dict]:
    if not os.path.exists(ACCEPTED_STUDENTS_FILE):
        return []
    try:
        with open(ACCEPTED_STUDENTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except (json.JSONDecodeError, IOError) as e:
        print(f"[WARN] Accepted fájl olvasási hiba: {e}")
        return []


def save_accepted_students(students: list[dict]) -> None:
    temp_file = ACCEPTED_STUDENTS_FILE + ".tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(students, f, ensure_ascii=False)
        os.replace(temp_file, ACCEPTED_STUDENTS_FILE)
    except Exception as e:
        print(f"[WARN] Accepted fájl mentési hiba: {e}")


def log_accepted_student(index_number: str, rssi: int) -> None:
    course_id = get_active_course_id()
    if course_id is None:
        return

    students = load_accepted_students()

    if any(s.get("index_number") == index_number and s.get("course_id") == course_id for s in students):
        return

    students.append(
        {
            "index_number": index_number,
            "course_id": course_id,
            "rssi": rssi,
            "timestamp": datetime.datetime.now(SERBIAN_TZ).strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    save_accepted_students(students)


def get_student_id_by_indexszam(indexszam: str) -> int | None:
    """
    A diak tábla lekérdezése az adott indexszám belső azonosítójához.
    """
    url = f"{SUPABASE_URL}/rest/v1/diak"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    params = {
        "indexszam": f"eq.{indexszam}",
        "select": "id",
        "limit": 1
    }
    
    try:
        r = httpx.get(url, headers=headers, params=params, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                return data[0]["id"]
        return None
    except Exception as e:
        print(f"[ERROR] Diák ID lekérési hiba: {e}")
        return None


# ============================================
# Offline mentés és későbbi szinkron logika
# ============================================

OFFLINE_FOLDER = "offline"
is_syncing = False


def save_offline_attendance(data: dict) -> None:
    """
    Jelenlét mentése helyi JSON fájlba későbbi szinkronhoz.
    Fájlnév formátum: 
    -raspberry: év_hónap_nap_óra:perc:másodperc.json
    -windows: év_hónap_nap_óra-perc-másodperc.json
    """
    if not os.path.exists(OFFLINE_FOLDER):
        os.makedirs(OFFLINE_FOLDER)

    # Formátum: év_hónap_nap_óra:perc:másodperc
    now = datetime.datetime.now()
    if platform.system() == "Windows":
        timestamp = now.strftime("%Y_%m_%d_%H-%M-%S")
    elif platform.system() == "Linux":
        timestamp = now.strftime("%Y_%m_%d_%H:%M:%S")
        
    base_filename = f"{timestamp}.json"
    filepath = os.path.join(OFFLINE_FOLDER, base_filename)

    # Ha a fájl már létezik (azonos másodperc), számlálóval tesszük egyedivé
    counter = 1
    while os.path.exists(filepath):
        timestamp_unique = f"{timestamp}_{counter}"
        base_filename = f"{timestamp_unique}.json"
        filepath = os.path.join(OFFLINE_FOLDER, base_filename)
        counter += 1

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"  → Offline mentve: {base_filename}")
    except Exception as e:
        print(f"  → Offline mentési hiba: {e}")


def check_internet_connection() -> bool:
    """
    Internetkapcsolat ellenőrzése Supabase végpont elérésével.
    """
    try:
        url = f"{SUPABASE_URL}/rest/v1/"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        r = httpx.get(url, headers=headers, timeout=5)
        return r.status_code in (200, 400, 404)  # Bármely válasz azt jelzi, hogy online vagyunk
    except Exception:
        return False


def sync_logic() -> None:
    """
    Offline fájlok feltöltése Supabase-be.
    Háttérszálon fut.
    - Csak sikeres feltöltés után töröl
    - Hibánál a fájlt megtartja és a következővel folytatja
    - Új adat új fájlt hoz létre a meglévőktől függetlenül
    """
    global is_syncing

    if is_syncing:
        return

    is_syncing = True

    try:
        # Először ellenőrizzük az internetkapcsolatot
        if not check_internet_connection():
            print("[SYNC] Nincs internetkapcsolat, kihagyás...")
            return

        pattern = os.path.join(OFFLINE_FOLDER, "*.json")
        files = glob.glob(pattern)

        if not files:
            return

        files.sort()

        url = f"{SUPABASE_URL}/rest/v1/attendance"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        print(f"[SYNC] {len(files)} offline fájl szinkronizálása...")

        successful_uploads = 0
        failed_uploads = 0

        for filepath in files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    payload = json.load(f)

                r = httpx.post(url, headers=headers, json=payload, timeout=10)

                if r.status_code in (200, 201, 204):
                    os.remove(filepath)
                    filename = os.path.basename(filepath)
                    print(f"[SYNC] Feltöltve és törölve: {filename}")
                    successful_uploads += 1
                else:
                    # Feltöltés sikertelen: a fájlt megtartjuk későbbi próbához
                    filename = os.path.basename(filepath)
                    print(f"[SYNC] Hiba ({r.status_code}): {filename} - megtartva későbbi próbálkozáshoz")
                    failed_uploads += 1
                    # Folytatás a következő fájllal megszakítás nélkül

            except httpx.TimeoutException:
                filename = os.path.basename(filepath)
                print(f"[SYNC] Időtúllépés: {filename} - megtartva későbbi próbálkozáshoz")
                failed_uploads += 1
                # Folytatás a következő fájllal

            except Exception as e:
                filename = os.path.basename(filepath)
                print(f"[SYNC] Szinkronizálási hiba: {filename} - {e}")
                failed_uploads += 1
                # Folytatás a következő fájllal

        if successful_uploads > 0 or failed_uploads > 0:
            print(f"[SYNC] Összesítés: {successful_uploads} sikeres, {failed_uploads} sikertelen")

    finally:
        is_syncing = False


def trigger_sync() -> bool:
    """
    Szinkron indítása háttérszálon, ha vannak offline fájlok.
    Returns:
        True: Ha talált fájlokat és elindította a szinkronizációt.
        False: Ha üres volt az offline mappa.
    """
    if not os.path.exists(OFFLINE_FOLDER):
        return False

    pattern = os.path.join(OFFLINE_FOLDER, "*.json")
    files = glob.glob(pattern)

    if files:
        print(f"[OFFLINE] {len(files)} fájl vár szinkronizálásra...")
        # Daemon=True, hogy a főprogram leállásakor ez is leálljon
        sync_thread = threading.Thread(target=sync_logic, daemon=True)
        sync_thread.start()
        return True  # Jelezzük, hogy volt mit szinkronizálni
    
    return False  # Letezett az 'offline' mappa, de üres volt


def check_offline_folder_on_startup() -> None:
    """
    Induláskor offline mappa ellenőrzése és állapot jelentése.
    Ha vannak várakozó fájlok, megpróbálja szinkronizálni.
    """
    if not os.path.exists(OFFLINE_FOLDER):
        print("[OFFLINE] Nincs offline mappa, létrehozás...")
        os.makedirs(OFFLINE_FOLDER)
        return

    pattern = os.path.join(OFFLINE_FOLDER, "*.json")
    files = glob.glob(pattern)

    if not files:
        print("[OFFLINE] Offline mappa üres, nincs szinkronizálni való.")
    else:
        print(f"[OFFLINE] {len(files)} fájl található az offline mappában.")
        # Szinkron indításának kísérlete
        if trigger_sync():
            print("[STARTUP] Háttérszinkronizáció elindítva.")


# ============================================
# Validáló függvények
# ============================================

def is_valid_index_number(index_number: str) -> bool:
    """8 számjegyű indexszám?"""
    return bool(INDEX_NUMBER_REGEX.match(index_number))


def student_exists(index_number: str) -> bool:
    """
    Supabase REST lekérdezés (diak tábla) indexszám alapján
    """
    url = f"{SUPABASE_URL}/rest/v1/diak"

    params = {
        "indexszam": f"eq.{index_number}",
        "select": "id",
        "limit": 1
    }

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    try:
        r = httpx.get(url, headers=headers, params=params, timeout=10)

        if r.status_code != 200:
            print(f"Supabase hiba ({r.status_code}): {r.text}")
            return False

        data = r.json()
        return len(data) > 0

    except Exception as e:
        print("Supabase elérési hiba:", e)
        return False


def insert_attendance(student_indexszam: str, rssi: int) -> None:
    """
    Jelenlét beszúrása Supabase-be (Store and Forward támogatással)
    Az alábbi mezőket használja: course_id, diak_id, datum
    """
    # 1. Aktív óra ellenőrzése
    course_id = get_active_course_id()
    if course_id is None:
        print("  → [WARN] Nincs aktív óra! Jelenlét nem rögzíthető.")
        return

    # 2. Diák belső azonosító lekérése indexszám alapján
    diak_id = get_student_id_by_indexszam(student_indexszam)
    if diak_id is None:
        print(f"  → [ERROR] Nem található diák ID az indexszámhoz: {student_indexszam}")
        return

    # 3. Payload összeállítása a pontos sémával
    url = f"{SUPABASE_URL}/rest/v1/attendance"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    payload = {
        "course_id": course_id,
        "diak_id": diak_id,
        "datum": datetime.datetime.now(SERBIAN_TZ).strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=10)

        if r.status_code in (200, 201, 204):
            print(f"  → Mentve Supabase-be: diák={student_indexszam}, óra={course_id}")
            # Szinkron meghivasa, és automatikus logolas történik a háttérben, ha van mit feltölteni.
            was_sync_triggered = trigger_sync()
            if was_sync_triggered:
                print("  → [INFO] Offline adatok találhatók, szinkronizáció elindítva...")
        
        else:
            print(f"  → API hiba ({r.status_code}), offline mentés...")
            save_offline_attendance(payload)

    except Exception as e:
        print(f"  → Hálózati hiba ({e}), offline mentés...")
        save_offline_attendance(payload)


def extract_student_id(device, advertisement_data):
    """
    Indexszám kinyerése a device névből vagy a service data-ból
    """
    if device.name:
        if device.name.isdigit() and len(device.name) == 8:
            return device.name
    
    service_data = getattr(advertisement_data, "service_data", None)
    if not service_data:
        return None

    for uuid, raw in service_data.items():
        if uuid.lower() == APP_SERVICE_UUID_NORMALIZED:
            try:
                return raw.decode("utf-8")
            except:
                return None

    return None


def detection_callback(device, advertisement_data):
    """
    BLE callback — csökkentett log:
    - csak app UUID + studentID esetén ír ki
    """
    global processed_macs, found_students

    rssi = getattr(advertisement_data, "rssi", None)
    if rssi is None:
        return

    index_number = extract_student_id(device, advertisement_data)
    if not index_number:
        return

    if device.address in processed_macs:
        return

    print(f"[APP] MAC={device.address} | indexszám='{index_number}' | RSSI={rssi} dBm")

    # 1) Formátum ellenőrzés
    if not is_valid_index_number(index_number):
        print("  → Hibás indexszám formátum.\n")
        return

    # 2) Supabase ellenőrzés
    if not student_exists(index_number):
        print("  → Nincs ilyen diák Supabase-ben.\n")
        return

    # 3) RSSI ellenőrzés
    if rssi < RSSI_THRESHOLD:
        print(f"  → Gyenge jel ({rssi} < {RSSI_THRESHOLD})\n")
        return

    # OK → Feldolgozható
    processed_macs.add(device.address)
    found_students += 1

    print(f"[OK] Felismert diák: {index_number} (RSSI={rssi})")

    log_accepted_student(index_number, rssi)
    insert_attendance(index_number, rssi)
    print()


def input_listener(stop_event, loop):
    """
    Külön szálon fut: figyeli, hogy a felhasználó beírja-e a 'q'-t.
    """
    print(">>> Nyomj 'q'-t és ENTER-t a leállítás kéréséhez...")
    while True:
        user_input = input()
        if user_input.strip().lower() == 'q':
            print("[STOP] Leállítás kezdeményezése...")
            # Jelezzük az aszinkron loopnak, hogy vége
            loop.call_soon_threadsafe(stop_event.set)
            break

async def scan_once():
    # Induláskor offline mappa ellenőrzése és szinkron indítása
    check_offline_folder_on_startup()

    # Indulás előtt aktív óra ellenőrzése
    course_id = get_active_course_id()
    if course_id is None:
        print("=" * 50)
        print("[WARN] NINCS AKTÍV ÓRA!")
        print("Indítsd el az órát a webes felületen: http://localhost:5000")
        print("=" * 50)
    else:
        print(f"[INFO] Aktív óra ID: {course_id}")

    print("\nIndul a BLE scanner…")
    print("OS:", platform.system())
    print(f"Scan idő: {SCAN_INTERVAL} mp")
    print(f"Keresett Service UUID: {APP_SERVICE_UUID}\n")

    # Esemény és Loop lekérése
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    # Input figyelő szál indítása
    # Daemon=True, hogy a program kilépésekor ez is leálljon
    input_thread = threading.Thread(target=input_listener, args=(stop_event, loop), daemon=True)
    input_thread.start()

    async with BleakScanner(
        detection_callback,
        service_uuids=[APP_SERVICE_UUID]
    ):
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=SCAN_INTERVAL)
            print("\n[INFO] Scan megszakítva felhasználói kérésre.")
        except asyncio.TimeoutError:
            print("\n[INFO] Scan idő lejárt (normál leállás).")

    print("\n-----------------------------")
    print("Scan sikeresen lefutott.")

    if found_students == 0:
        print("NINCS találat (nem érkezett app UUID + studentID hirdetés).")
    else:
        print(f"Összesen {found_students} diákot felismertünk.")

    print("-----------------------------\n")

def log_sync_event() -> None:
    """
    Sikeres szinkronizáció bejegyzése a sync_logs táblába.
    """
    # Ha nincs beállítva ID, nem tudunk mit logolni
    if not RASPBERRY_DEVICE_RANDOM_ID:
        return

    url = f"{SUPABASE_URL}/rest/v1/sync_logs"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Csak a device ID-t küldjük, a 'synced_at' időbélyeget a Supabase 
    # automatikusan hozzáadja (default now()).
    payload = {
        "raspberry_devices_id": int(RASPBERRY_DEVICE_RANDOM_ID)
    }

    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=5)
        if r.status_code in (200, 201, 204):
            print(f"[SYNC-LOG] Szinkronizáció naplózva (Device ID: {RASPBERRY_DEVICE_RANDOM_ID})")
        else:
            print(f"[SYNC-LOG] Hiba a naplózáskor: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"[SYNC-LOG] Kivétel a naplózáskor: {e}")

def sync_logic() -> None:
    """
    Offline fájlok feltöltése Supabase-be + Logolás a sync_logs táblába.
    """
    global is_syncing

    if is_syncing:
        return

    is_syncing = True

    try:
        # Net ellenőrzés
        if not check_internet_connection():
            print("[SYNC] Nincs internetkapcsolat, kihagyás...")
            return

        pattern = os.path.join(OFFLINE_FOLDER, "*.json")
        files = glob.glob(pattern)

        if not files:
            return

        files.sort()

        url = f"{SUPABASE_URL}/rest/v1/attendance"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        print(f"[SYNC] {len(files)} offline fájl szinkronizálása...")

        successful_uploads = 0
        failed_uploads = 0

        for filepath in files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    payload = json.load(f)

                r = httpx.post(url, headers=headers, json=payload, timeout=10)

                if r.status_code in (200, 201, 204):
                    os.remove(filepath)
                    filename = os.path.basename(filepath)
                    print(f"[SYNC] Feltöltve és törölve: {filename}")
                    successful_uploads += 1
                else:
                    filename = os.path.basename(filepath)
                    print(f"[SYNC] Hiba ({r.status_code}): {filename} - megtartva")
                    failed_uploads += 1

            except Exception as e:
                print(f"[SYNC] Hiba: {e}")
                failed_uploads += 1

        # LOGOLÁS: Ha volt legalább egy sikeres feltöltés, akkor írunk a sync_logs táblába!
        if successful_uploads > 0:
            print(f"[SYNC] Kész. Sikeres: {successful_uploads}, Hiba: {failed_uploads}")
            # Itt hívjuk meg a logolást, mert itt tudjuk, hogy tényleg átment az adat
            log_sync_event()
        elif failed_uploads > 0:
            print(f"[SYNC] Minden feltöltés sikertelen volt.")

    finally:
        is_syncing = False

if __name__ == "__main__":
    asyncio.run(scan_once())