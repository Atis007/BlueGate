import asyncio
import platform
import sys
import re
import os

import httpx
from dotenv import load_dotenv
from bleak import BleakScanner

from config import APP_SERVICE_UUID, RSSI_THRESHOLD, SCAN_INTERVAL

# .env betöltése
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Nincs SUPABASE_URL vagy SUPABASE_SERVICE_KEY a .env-ben!")
    sys.exit(1)

<<<<<<< HEAD
# UUID: lowercase normalizálás Linux/BlueZ kompatibilitáshoz
APP_SERVICE_UUID_NORMALIZED = APP_SERVICE_UUID.lower()

# Már feldolgozott app-eszközök MAC címei
processed_macs = set()
found_students = 0

# Student ID minta (pl. student27223015)
STUDENT_ID_REGEX = re.compile(r"^student[0-9]{8}$")


def is_valid_student_id(student_id: str) -> bool:
    return bool(STUDENT_ID_REGEX.match(student_id))

=======
seen = set()
found_students = 0

# Ellenőrzi a student_id formátumát
def is_valid_student_id(student_id):
    """
    Valid student ID format: 'student' + 8 digits (pl student12345678)
    """
    return bool(re.match(r"^student[0-9]{8}$", student_id))
>>>>>>> 41b30b0 (Folyamatban lévő módosítások mentése a mobilapp és a Raspberry scanner fájljaiban (broadcast, configok, scan.py))

def student_exists(student_id: str) -> bool:
    """
    Supabase REST lekérdezés (students tábla)
    """
    url = f"{SUPABASE_URL}/rest/v1/students"

    params = {
        "student_id": f"eq.{student_id}",
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


def insert_attendance(student_id: str, rssi: int) -> None:
    """
    Attendance beszúrása Supabase-be
    """
    url = f"{SUPABASE_URL}/rest/v1/attendance"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    payload = {
        "student_id": student_id,
        "rssi": int(rssi)
    }

    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=10)

        if r.status_code not in (200, 201, 204):
            print("Nem sikerült a jelenlét beírása:", r.status_code, r.text)
        else:
            print(f"  → Mentve Supabase-be: {student_id}")

    except Exception as e:
        print("Supabase beszúrási hiba:", e)


def extract_student_id(advertisement_data):
    """
    Service Data → studentID kinyerése UTF-8-ban
    """
    service_data = getattr(advertisement_data, "service_data", None)
    if not service_data:
        return None

<<<<<<< HEAD
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

    # App UUID + studentID kinyerése
    student_id = extract_student_id(advertisement_data)
    if not student_id:
        return  # random eszköz → nem logolunk

    # Ne dolgozzuk fel kétszer ugyanazt a MAC-et
    if device.address in processed_macs:
        return

    # *Most* írunk először logot → mert ez tényleg app hirdetés
    print(f"[APP] MAC={device.address} | student_id='{student_id}' | RSSI={rssi} dBm")

    # 1) Formátum check
    if not is_valid_student_id(student_id):
        print("  → Hibás studentID formátum.\n")
        return

    # 2) Supabase check
    if not student_exists(student_id):
        print("  → Nincs ilyen diák Supabase-ben.\n")
        return

    # 3) RSSI check
    if rssi < RSSI_THRESHOLD:
        print(f"  → Gyenge jel ({rssi} < {RSSI_THRESHOLD})\n")
        return

    # OK → Feldolgozhatjuk
    processed_macs.add(device.address)
    found_students += 1

    print(f"[OK] Felismert diák: {student_id} (RSSI={rssi})")

    insert_attendance(student_id, rssi)
    print()


async def scan_once():
    print("Indul a BLE scanner…")
    print("OS:", platform.system())
    print(f"Scan idő: {SCAN_INTERVAL} mp\n")

    async with BleakScanner(detection_callback):
        await asyncio.sleep(SCAN_INTERVAL)

    print("\n-----------------------------")
    print("Scan sikeresen lefutott.")

    if found_students == 0:
        print("NINCS találat (nem érkezett app UUID + studentID hirdetés).")
    else:
        print(f"Összesen {found_students} diákot felismertünk.")

    print("-----------------------------\n")
=======
    # Ha nem a mi Service UUID-ünk → skip
    if APP_SERVICE_UUID not in service_data:
        return None
    
    try:
        return service_data[APP_SERVICE_UUID].decode("utf-8")
    except Exception:
        return None

def detection_callback(device, advertisement_data):
    """
    EZ FUT LE MINDEN EGYES BLE HIRDETÉS ESEMÉNYNÉL.

    Ez az új módszer → Raspberry Pi-n ez 100%-ban működik,
    mert NEM discover()-t használunk, hanem BlueZ event stream-et.
    """

    global seen, found_students

    rssi = getattr(advertisement_data, 'rssi', None)
    if rssi is None:
        return
    
    print(f"[DETEKTÁLT] MAC={device.address} RSSI={rssi}")

    # Ha már feldolgoztuk ezt a MAC address-t → skip
    if device.address in seen:
        return
    seen.add(device.address)

    # Student ID kinyerése Service Data-ból
    student_id = extract_student_id(advertisement_data)
    if not student_id:
        print("  → Nem app UUID, kihagyva.\n")
        return

    print(f"[APP UUID] ServiceData student_id='{student_id}'")

    # 1) Formátum ellenőrzés
    if not is_valid_student_id(student_id):
        print("  → Hibás formátum, kihagyva.")
        return

    # 2) Diák létezik-e?
    if not student_exists(student_id):
        print("  → Nem létező diák Supabase-ben.")
        return

    # 3) RSSI szűrés
    if rssi < RSSI_THRESHOLD:
        print(f"  → Gyenge jel ({rssi} dBm), kihagyva.")
        return

    found_students += 1
    
    print(f"[OK] Felismert diák: {student_id} | RSSI={rssi} dBm")

    # 4) Mentés Supabase-be
    # insert_attendance(student_id, rssi)  # teszt alatt kikommentelve

# BLE scan egyszeri futtatása
async def scan_once():
    print("Indul a BLE scanner…")
    print("OS:", platform.system())
    print(f"Scan időtartama: {SCAN_INTERVAL} mp\n")

    scanner = BleakScanner(detection_callback)

    print("Scanning... (BleakScanner callback módszer, Raspberry Pi kompatibilis)\n")

    await scanner.start()
    await asyncio.sleep(SCAN_INTERVAL)
    await scanner.stop()

    print("\n-----------------------------")
    print("Scan sikeresen lefutott.")

    if found_students == 0:
        print("Nem találtunk app-UUID-val rendelkező eszközt.")
    else:
        print(f"Összesen {found_students} diákot ismertünk fel és dolgoztunk fel.")

    print("-----------------------------\n")
    sys.exit(0)
>>>>>>> 41b30b0 (Folyamatban lévő módosítások mentése a mobilapp és a Raspberry scanner fájljaiban (broadcast, configok, scan.py))


if __name__ == "__main__":
    asyncio.run(scan_once())