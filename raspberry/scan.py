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

# UUID: lowercase normalizálás Linux/BlueZ kompatibilitáshoz
APP_SERVICE_UUID_NORMALIZED = APP_SERVICE_UUID.lower()

# Már feldolgozott app-eszközök MAC címei
processed_macs = set()
found_students = 0

# Index szám minta (8 számjegy)
INDEX_NUMBER_REGEX = re.compile(r"^[0-9]{8}$")


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
        "indexszam": student_id,  # indexszám helyett student_id
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


def extract_student_id(device, advertisement_data):
    """
    Indexszám kinyerése a device name-ből vagy service data-ból
    """
    # Először próbáljuk a device name-ből
    if device.name:
        # Ha a device name 8 számjegy, az az indexszám
        if device.name.isdigit() and len(device.name) == 8:
            return device.name
    
    # Ha nincs device name, próbáljuk a service data-ból
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

    # App UUID + indexszám kinyerése (device name-ből vagy service data-ból)
    index_number = extract_student_id(device, advertisement_data)
    if not index_number:
        return  # random eszköz → nem logolunk

    # Ne dolgozzuk fel kétszer ugyanazt a MAC-et
    if device.address in processed_macs:
        return

    # *Most* írunk először logot → mert ez tényleg app hirdetés
    print(f"[APP] MAC={device.address} | indexszám='{index_number}' | RSSI={rssi} dBm")

    # 1) Formátum check
    if not is_valid_index_number(index_number):
        print("  → Hibás indexszám formátum.\n")
        return

    # 2) Supabase check
    if not student_exists(index_number):
        print("  → Nincs ilyen diák Supabase-ben.\n")
        return

    # 3) RSSI check
    if rssi < RSSI_THRESHOLD:
        print(f"  → Gyenge jel ({rssi} < {RSSI_THRESHOLD})\n")
        return

    # OK → Feldolgozhatjuk
    processed_macs.add(device.address)
    found_students += 1

    print(f"[OK] Felismert diák: {index_number} (RSSI={rssi})")

    insert_attendance(index_number, rssi)
    print()


async def scan_once():
    print("Indul a BLE scanner…")
    print("OS:", platform.system())
    print(f"Scan idő: {SCAN_INTERVAL} mp")
    print(f"Keresett Service UUID: {APP_SERVICE_UUID}\n")

    # Szűrés Service UUID-ra
    async with BleakScanner(
        detection_callback,
        service_uuids=[APP_SERVICE_UUID]  # Csak a mi UUID-nkat keressük
    ):
        await asyncio.sleep(SCAN_INTERVAL)

    print("\n-----------------------------")
    print("Scan sikeresen lefutott.")

    if found_students == 0:
        print("NINCS találat (nem érkezett app UUID + studentID hirdetés).")
    else:
        print(f"Összesen {found_students} diákot felismertünk.")

    print("-----------------------------\n")


if __name__ == "__main__":
    asyncio.run(scan_once())