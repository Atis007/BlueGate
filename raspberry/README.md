# Raspberry BLE Scanner + Web UI (local venv)

This folder contains:

- `scan.py`: BLE scanner that records attendance to Supabase (with offline store-and-forward).
- `app.py`: lightweight Flask web UI to start/stop an active class (session file).
- `config.py`: scanner settings (UUID, RSSI threshold, scan interval).

## 1) System prerequisites (Linux / Raspberry Pi)

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip bluez
```

## 2) Create and activate venv

```bash
cd /home/ricsi/Projects/BlueGate/raspberry
python3 -m venv .venv
source .venv/bin/activate
```

## 3) Install Python dependencies

```bash
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.md
```

## 4) Configure environment

Create a `.env` file in this folder:

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```

## 5) Run the web UI (start/stop class)

```bash
source .venv/bin/activate
python app.py
```

Open: http://localhost:5000

This writes `current_session.json` with the active `course_id` and course name. The scanner reads this file to know which class is active.

## 6) Run the scanner

```bash
source .venv/bin/activate
python scan.py
# if you get permission/adapter errors:
sudo python scan.py
```

## Notes

- On Debian/Ubuntu/Pi OS, the system Python environment is "externally managed". Using a venv is recommended.
- BLE scanning requires BlueZ. If scanning fails, ensure Bluetooth is running:

```bash
sudo systemctl status bluetooth
sudo rfkill unblock bluetooth
```

## Offline mode

- If Supabase is unreachable, attendance payloads are saved to `offline/` as JSON.
- When connectivity returns, files are synced automatically and deleted on success.