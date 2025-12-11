# Raspberry Bluetooth setup (local venv)

This folder contains `scan.py` which uses the `bleak` Python library for Bluetooth LE scanning.

Quick setup (Linux / Raspberry Pi):

1. Install system prerequisites (if missing):

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip bluez
```

2. Create and activate a virtual environment in this folder:

```bash
cd /home/ricsi/Projects/BlueGate/raspberry
python3 -m venv .venv
source .venv/bin/activate
```

3. Upgrade packaging tools and install bleak:

```bash
python -m pip install --upgrade pip setuptools wheel
pip install bleak
```

4. Verify bleak is installed:

```bash
python -c "import importlib.metadata as m; print('bleak', m.version('bleak'))"
```

5. Run the scanner (may require root or appropriate BlueZ permissions):

```bash
source .venv/bin/activate
python scan.py
# or, if you get permission/adapter errors, try:
sudo python scan.py
```

Notes:
- On Debian/Ubuntu/Pi OS, the system Python environment is "externally managed". Creating and using a venv is the recommended way to install packages like `bleak`.
- Bluetooth scanning may require BlueZ and appropriate kernel/DBus support. If scanning fails, ensure the Bluetooth adapter is up and the `bluetooth` service is running:

```bash
sudo systemctl status bluetooth
sudo rfkill unblock bluetooth
```

If you want, I can also add a small wrapper script that activates the venv and runs `scan.py` for convenience.
