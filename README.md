# BlueGate

BlueGate is a three-part attendance system built around Supabase:

- `bluegate-webapp` is the browser-based admin and teacher interface.
- `bluegate-mobilapp` is the student mobile app used to broadcast attendance over Bluetooth.
- `raspberry` is the Raspberry Pi BLE scanner and local control UI used to collect and sync attendance.

The system stores its shared data in Supabase tables and uses direct client access from the web app, mobile app, and Raspberry Pi service.

## Overview

BlueGate supports the full attendance flow for a school setting:

- admins manage students, teachers, courses, Raspberry devices, and logs
- teachers view their assigned courses and inspect attendance history
- students sign in with their index number and broadcast a BLE identifier from the mobile app
- the Raspberry Pi scanner listens for BLE advertisements, records attendance, and syncs offline records when connectivity returns

## Repository Structure

### `bluegate-webapp`

React + Vite web application for administrators and teachers.

Implemented areas include:

- admin login
- role-based routing for admin and teacher accounts
- student management with create, edit, delete, search, and pagination
- teacher management with course assignments
- course creation
- teacher login logs
- attendance logs
- sync logs
- Raspberry device overview
- teacher dashboard with course listing
- course attendance view with filtering and pagination

### `bluegate-mobilapp`

Expo / React Native student app.

Implemented areas include:

- login by index number and password
- authenticated student session handling with Supabase
- BLE advertising through a custom native module
- attendance confirmation through Supabase realtime updates
- permission handling for Bluetooth and location on Android
- themed UI components and Expo Router navigation

### `raspberry`

Python-based Raspberry Pi attendance collector and local web UI.

Implemented areas include:

- Flask interface for starting and stopping an active class
- course selection from Supabase
- background BLE scanning with `bleak`
- attendance recording to Supabase
- offline queueing to local JSON files when Supabase is unavailable
- automatic syncing of queued attendance once connectivity returns
- sync event logging for Raspberry devices

## System Architecture

### Data flow

1. An admin creates teachers, students, and courses in the web app.
2. Teachers log in to the web app and view the courses assigned to them.
3. A student logs in on the mobile app and starts BLE advertising with their index number.
4. The Raspberry Pi scanner detects the BLE broadcast and writes the attendance row to Supabase.
5. The mobile app listens for the attendance insert through Supabase realtime and shows confirmation.
6. If the Raspberry Pi is offline, attendance payloads are written to disk and synchronized later.

### Supabase tables used by the codebase

- `admin` - administrator accounts
- `teacher` - teacher accounts
- `diak` - student accounts
- `courses` - course records
- `teacher_courses` - teacher-to-course relationships
- `attendance` - attendance entries
- `teacher_login_logs` - teacher authentication history
- `sync_logs` - Raspberry Pi sync history
- `raspberry_devices` - Raspberry device registry

## Technology Stack

### Web app

- React 19
- Vite
- TypeScript
- React Router
- Supabase JavaScript client
- bcryptjs for password verification

### Mobile app

- Expo
- React Native 0.81
- Expo Router
- React Navigation
- Supabase JavaScript client
- bcryptjs for password verification
- custom BLE advertiser native module

### Raspberry service

- Python 3
- Flask
- bleak for BLE scanning
- httpx for Supabase calls
- python-dotenv for configuration loading

## Authentication and Access Control

### Web app

- Users authenticate against the `admin` or `teacher` table.
- The session helper stores the active profile in browser local storage.
- Routes are protected by role checks for `admin` and `teacher`.

### Mobile app

- Students authenticate against the `diak` table using index number and password.
- Auth state is stored in the Expo app context.
- The app redirects automatically between login and student screens based on auth state.

### Raspberry service

- The control UI uses a local session file to track the active course.
- The scanner process reads that session file to know which course is currently running.

## Key Features

- Admin and teacher sign-in backed by Supabase
- Student sign-in by index number
- Role-based web routing
- Course assignment and attendance review for teachers
- Search, filtering, and pagination on management screens
- BLE-based attendance capture from the mobile app
- Realtime attendance confirmation on the mobile app
- Offline attendance queueing and later synchronization on the Raspberry Pi
- Device tracking and sync logging

## Runtime Files Created by the Raspberry Service

- `current_session.json` - active course information
- `accepted_students.json` - accepted attendance records for the current session
- `offline/` - queued attendance payloads waiting for sync

## Environment Variables

### Web app

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Mobile app

- `EXPO_PUBLIC_APP_SERVICE_UUID`
- Supabase variables defined by the app's Supabase client setup

### Raspberry service

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Running the Projects

### Web app

```bash
cd bluegate-webapp
npm install
npm run dev
```

### Mobile app

```bash
cd bluegate-mobilapp
npm install
npm start
```

### Raspberry service

```bash
cd raspberry
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.md
python app.py
```

To run the scanner directly:

```bash
python scan.py
```

## Notes

- The web app is centered on admin and teacher workflows rather than public browsing.
- The mobile app is designed for students and depends on Bluetooth permissions on Android.
- The Raspberry Pi scanner expects BLE support through BlueZ on Linux-based systems.
- Offline attendance sync is file-based and intended as a fallback when Supabase is unreachable.

## Project Layout

```text
agilis/
├── bluegate-webapp/     React web app for admins and teachers
├── bluegate-mobilapp/   Expo mobile app for students
├── raspberry/           Flask UI and BLE attendance scanner
└── README.md            Project overview and setup notes
```
