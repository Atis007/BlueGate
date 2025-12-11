import asyncio
import platform
import sys
import re
import httpx
import os
from dotenv import load_dotenv
from bleak import BleakScanner
from config import APP_SERVICE_UUID, RSSI_THRESHOLD, SCAN_INTERVAL

load_dotenv() # .env fájl betöltése

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Nincs SUPABASE_URL vagy SUPABASE_SERVICE_KEY beállítva a .env fájlban!")
    sys.exit(1)

seen = set()
found_students = 0

# Ellenőrzi a student_id formátumát
def is_valid_student_id(student_id):
    """
    Valid student ID format: 'student' + 8 digits (pl student12345678)
    """
    return bool(re.match(r"^student[0-9]{8}$", student_id))

# Supabase lekérdezés – létezik-e a diák?
def student_exists(student_id: str) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/students"
    params = {
        "student_id": f"eq.{student_id}",
        "select": "id"
    }

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    try:
        r = httpx.get(url, headers=headers, params=params, timeout=10)

        if r.status_code != 200:
            print(f"Supabase hiba ({r.status_code}):", r.text)
            return False

        data = r.json()
        return len(data) > 0

    except Exception as e:
        print("Supabase elérési hiba:", e)
        return False


# Supabase INSERT – jelenlét mentése
def insert_attendance(student_id: str, rssi: int):
    url = f"{SUPABASE_URL}/rest/v1/attendance"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "student_id": student_id,
        "rssi": rssi
    }

    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=10)

        if r.status_code not in (200, 201):
            print("Nem sikerult a jelenlet beirasa:", r.text)
        else:
            print(f"Mentve Supabase-be: {student_id}")

    except Exception as e:
        print("Supabase beszúrási hiba:", e)

def extract_student_id(advertisement_data):
    """
    Kinyeri a student_id-t a Service Data-ból.
    Windows és Linux alatt is működik.
    """
    service_data = advertisement_data.service_data

    if not service_data:
        return None

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


if __name__ == "__main__":
    asyncio.run(scan_once())
