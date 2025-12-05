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

    # Ha nincs a mi Service UUID-ünk → nem a mobilapp
    if APP_SERVICE_UUID not in service_data:
        return None

    raw = service_data[APP_SERVICE_UUID]

    try:
        return raw.decode("utf-8")
    except (UnicodeDecodeError, AttributeError):
        return None

# BLE scan egyszeri futtatása
async def scan_once():
    print("Indul a BLE scanner…")
    print("OS:", platform.system())
    print(f"Scan idotartama: {SCAN_INTERVAL} mp\n")

    print("\nSearching for BLE devices...\n")

    devices = await BleakScanner.discover(timeout=SCAN_INTERVAL)

    print("\nScan befejezve, feldolgozás...\n")

    for dev in devices:
        ad = None
        # Windows → dev.details
        if hasattr(dev, "details") and dev.details:
            ad = getattr(dev.details, "advertisement_data", None)

        # Linux → dev.metadata
        if not ad and hasattr(dev, "metadata"):
            ad = dev.metadata.get("advertisement_data")
        
        # Ha továbbra sincs advertisement_data → skip
        if not ad:
            continue

        student_id = extract_student_id(ad)
        if not student_id:
            continue  # más eszköz, nem a mobilapp

        # Student ID formátum ellenőrzése
        if not is_valid_student_id(student_id):
            print(f"Formátum hibás → {student_id}")
            continue

        # Student létezik-e Supabase-ben?
        if not student_exists(student_id):
            print(f"Nincs ilyen diák Supabase-ben → {student_id}")
            continue

        rssi = dev.rssi
        if rssi is None or rssi < RSSI_THRESHOLD:
            print(f"Gyenge jel → student={student_id}, RSSI={rssi} dBm")
            continue

        print(f"Felismert diák: {student_id} | RSSI={rssi} dBm | MAC={dev.address}")

        # Mentés Supabase-be
        # insert_attendance(student_id, rssi) # Ezt most kikommenteztem teszteléshez

    print("\nScan véget ért → Program leáll.")
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(scan_once())
