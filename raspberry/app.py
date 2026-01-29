import os
import json
import sys
import subprocess
from flask import Flask, render_template_string, request, redirect, url_for, flash
import httpx
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

SESSION_FILE = "current_session.json"
ACCEPTED_STUDENTS_FILE = "accepted_students.json"
SCAN_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scan.py")
scan_process = None

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jelenléti Rendszer</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: stretch;
            padding: 20px;
            gap: 24px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
            align-self: center;
        }
        .panel-right {
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            flex: 1;
            max-width: 600px;
            display: flex;
            flex-direction: column;
        }
        .panel-right h3 {
            color: #333;
            margin-bottom: 15px;
        }
        .panel-right .students-list {
            flex: 1;
            max-height: none;
        }
        .students-list {
            border: 1px solid #e6e6e6;
            border-radius: 8px;
            padding: 12px;
            max-height: 360px;
            overflow-y: auto;
            margin-top: 10px;
        }
        .student-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 10px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
        }
        .student-item:last-child {
            border-bottom: none;
        }
        .student-meta {
            color: #666;
            font-size: 12px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #444;
            font-weight: 600;
        }
        select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            background: white;
            cursor: pointer;
            transition: border-color 0.3s;
        }
        select:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .current-session {
            background: #e8f4fd;
            border: 1px solid #bee5eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        .current-session strong {
            color: #0c5460;
        }
        .stop-btn {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            margin-top: 10px;
        }
        .stop-btn:hover {
            box-shadow: 0 5px 20px rgba(220, 53, 69, 0.4);
        }
    </style>
    {% if active_course %}
    <script>
        setInterval(function() {
            fetch('/api/students')
                .then(response => response.json())
                .then(data => {
                    const list = document.getElementById('students-list');
                    if (data.length === 0) {
                        list.innerHTML = '<div class="student-meta">Még nincs elfogadott diák.</div>';
                    } else {
                        list.innerHTML = data.map(s => 
                            '<div class="student-item"><span>' + s.index_number + '</span><span class="student-meta">' + s.timestamp + '</span></div>'
                        ).join('');
                    }
                });
        }, 2000);
    </script>
    {% endif %}
</head>
<body>
    <div class="container">
        <h1>Jelenléti Rendszer</h1>
        <p class="subtitle">Raspberry Pi BLE Scanner</p>
        
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                {% for category, message in messages %}
                    <div class="alert alert-{{ category }}">{{ message }}</div>
                {% endfor %}
            {% endif %}
        {% endwith %}
        
        {% if active_course %}
        <div class="current-session">
            <strong>Aktív óra:</strong> {{ active_course }}
        </div>
        <form method="POST" action="{{ url_for('stop_class') }}">
            <button type="submit" class="stop-btn">Óra befejezése</button>
        </form>
        {% else %}
        <form method="POST" action="{{ url_for('start_class') }}">
            <div class="form-group">
                <label for="course">Válassz tantárgyat:</label>
                <select name="course_id" id="course" required>
                    <option value="">-- Válassz --</option>
                    {% for course in courses %}
                    <option value="{{ course.id }}">{{ course.nev }}</option>
                    {% endfor %}
                </select>
            </div>
            <button type="submit">Óra indítása</button>
        </form>
        {% endif %}
    </div>
    {% if active_course %}
    <div class="panel-right">
        <h3>Elfogadott diákok</h3>
        <div class="students-list" id="students-list">
            {% if accepted_students %}
                {% for student in accepted_students %}
                    <div class="student-item">
                        <span>{{ student.index_number }}</span>
                        <span class="student-meta">{{ student.timestamp }}</span>
                    </div>
                {% endfor %}
            {% else %}
                <div class="student-meta">Még nincs elfogadott diák.</div>
            {% endif %}
        </div>
    </div>
    {% endif %}
</body>
</html>
"""


def get_courses():
    """Összes tantárgy lekérése Supabase-ből."""
    url = f"{SUPABASE_URL}/rest/v1/courses"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    params = {"select": "id,nev", "order": "nev.asc"}
    
    try:
        r = httpx.get(url, headers=headers, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"Supabase hiba: {r.status_code} - {r.text}")
            return []
    except Exception as e:
        print(f"Kapcsolódási hiba: {e}")
        return []


def get_active_session():
    """Aktív session beolvasása a JSON fájlból."""
    if not os.path.exists(SESSION_FILE):
        return None
    try:
        with open(SESSION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("active_course_id"), data.get("active_course_name")
    except (json.JSONDecodeError, IOError):
        return None


def save_session(course_id, course_name):
    """Session mentése JSON fájlba (atomikus írás a biztonságért)."""
    data = {
        "active_course_id": course_id,
        "active_course_name": course_name
    }
    temp_file = SESSION_FILE + ".tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(temp_file, SESSION_FILE)
        return True
    except Exception as e:
        print(f"Session mentési hiba: {e}")
        return False


def clear_session():
    """Session fájl törlése."""
    try:
        if os.path.exists(SESSION_FILE):
            os.remove(SESSION_FILE)
        return True
    except Exception as e:
        print(f"Session törlési hiba: {e}")
        return False


def get_accepted_students(active_course_id: int | None) -> list[dict]:
    if not active_course_id:
        return []
    if not os.path.exists(ACCEPTED_STUDENTS_FILE):
        return []
    try:
        with open(ACCEPTED_STUDENTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            filtered = [s for s in data if s.get("course_id") == active_course_id]
            filtered.sort(key=lambda x: x.get("timestamp", ""))
            return filtered
    except (json.JSONDecodeError, IOError) as e:
        print(f"Accepted fájl olvasási hiba: {e}")
        return []


def start_scan_if_needed() -> tuple[bool, str]:
    """Indítja a scan.py-t háttérben, ha még nem fut."""
    global scan_process

    if scan_process and scan_process.poll() is None:
        return False, "A szkennelés már fut."

    if not os.path.exists(SCAN_SCRIPT):
        return False, "A scan.py nem található."

    try:
        scan_process = subprocess.Popen(
            [sys.executable, SCAN_SCRIPT],
            cwd=os.path.dirname(SCAN_SCRIPT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
        )
        return True, "Szkennelés elindítva."
    except Exception as e:
        return False, f"Szkennelés indítási hiba: {e}"


@app.route("/api/students")
def api_students():
    session = get_active_session()
    active_course_id = session[0] if session else None
    students = get_accepted_students(active_course_id)
    return students


@app.route("/")
def index():
    courses = get_courses()
    session = get_active_session()
    active_course = session[1] if session else None
    active_course_id = session[0] if session else None
    accepted_students = get_accepted_students(active_course_id)
    return render_template_string(
        HTML_TEMPLATE,
        courses=courses,
        active_course=active_course,
        accepted_students=accepted_students,
    )


@app.route("/start", methods=["POST"])
def start_class():
    course_id = request.form.get("course_id")
    if not course_id:
        flash("Kérlek válassz tantárgyat!", "error")
        return redirect(url_for("index"))
    
    # Tantárgynév lekérése a megjelenítéshez
    courses = get_courses()
    course_name = next((c["nev"] for c in courses if str(c["id"]) == course_id), "Ismeretlen")
    
    if save_session(int(course_id), course_name):
        flash(f"✅ Óra elindítva: {course_name}", "success")
        started, message = start_scan_if_needed()
        if started:
            flash(f"{message}", "success")
        else:
            flash(f"{message}", "error")
    else:
        flash("❌ Hiba történt az óra indításakor!", "error")
    
    return redirect(url_for("index"))


@app.route("/stop", methods=["POST"])
def stop_class():
    global scan_process
    
    # Stop the scan process if running
    if scan_process and scan_process.poll() is None:
        scan_process.terminate()
        try:
            scan_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            scan_process.kill()
        scan_process = None
    
    if clear_session():
        if os.path.exists(ACCEPTED_STUDENTS_FILE):
            try:
                os.remove(ACCEPTED_STUDENTS_FILE)
            except Exception as e:
                print(f"Accepted fájl törlési hiba: {e}")
        flash("Óra sikeresen befejezve!", "success")
    else:
        flash("Hiba történt az óra befejezésekor!", "error")
    return redirect(url_for("index"))


if __name__ == "__main__":
    print("=" * 50)
    print("Jelenléti Rendszer Web Interface")
    print("Elérhető: http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=False)