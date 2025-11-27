import asyncio
from bleak import BleakScanner

async def scan():
    print("Scanning for BLE devices (Windows)...")

    devices = await BleakScanner.discover(timeout=5)

    print("\n--- Devices Found ---")
    for d in devices:
        rssi = getattr(d, 'rssi', 'N/A') #Windows alatt N/A
        print(f"{d.address} | {d.name} | RSSI={rssi}")

if __name__ == "__main__":
    asyncio.run(scan())