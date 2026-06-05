# 🏫 School Bell System — React + Node.js + MySQL

This is the **PHP version of your School Bell System**, fully converted to:

- **Frontend** — React (Vite) + React Router
- **Backend** — Node.js + Express (REST API + sessions)
- **Database** — MySQL (same schema as your XAMPP install)
- **ESP32** — keeps working without changes (just point it to the new backend URL)

---

## 📋 Database Tables (same as PHP version)

| Table | Purpose |
|---|---|
| **`users`** | Admin login. Default user: `admin` / `admin123` |
| **`weekly_schedules`** | One row per weekday (0=Mon … 6=Sun) with on/off flag |
| **`schedule_entries`** | Each bell ring (linked to a weekday OR a special day) |
| **`special_days`** | Exam periods, holidays, custom date ranges |

The full schema is in [`sql/database.sql`](sql/database.sql).

---

## ⚡ Quick Start (5 steps)

### 1. Create the database

Open **phpMyAdmin** (XAMPP → Start MySQL → http://localhost/phpmyadmin) and:

- Click **Import** → choose `sql/database.sql` → **Go**.

Or from a terminal:
```bash
mysql -u root -p < sql/database.sql
```

This creates the `school_bell_system` database, all 4 tables, and the default `admin` user.

### 2. Install Node.js (one time)

Download from https://nodejs.org (LTS version, 18 or newer).

### 3. Start the backend (Express + MySQL)

```bash
cd backend
cp .env.example .env       # then open .env and set DB_USER/DB_PASS to match XAMPP
npm install
npm start
```

You should see: `✅ School Bell backend running on http://localhost:4000`

### 4. Start the frontend (React)

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Vite will print: `Local: http://localhost:5173`

### 5. Open the app

Go to **http://localhost:5173** and login with:

- Username: `admin`
- Password: `admin123`

> ⚠️ Change the password right after first login (Settings page).

---

## 🔌 ESP32 — keep using your existing sketch

The Node backend exposes the **same endpoints** the ESP32 was hitting in PHP, just at a new path:

| Old PHP endpoint | New Node endpoint |
|---|---|
| `GET  api/ring_now.php` | `GET  http://<server-ip>:4000/api/ring-now` |
| `POST api/update_status.php` | `POST http://<server-ip>:4000/api/update-status` |

In your `.ino` file, change the server URL/path to match the table above. Nothing else needs to change.

---

## 📁 Project Structure

```
school-bell-react/
├── sql/
│   └── database.sql            ← Import this in phpMyAdmin
├── backend/                    ← Node.js + Express API
│   ├── src/
│   │   ├── server.js           ← Entry point
│   │   ├── db/pool.js          ← MySQL connection pool
│   │   ├── state.js            ← In-memory ESP32 ring/heartbeat state
│   │   ├── middleware/auth.js
│   │   └── routes/
│   │       ├── auth.js         ← /api/auth/login, /logout, /me, /change-password
│   │       ├── schedule.js     ← /api/schedule, /today, /copy
│   │       ├── special-days.js ← /api/special-days (GET/POST/DELETE)
│   │       └── device.js       ← /api/ring-now, /api/check-status, /api/update-status
│   ├── .env.example
│   └── package.json
└── frontend/                   ← React (Vite)
    ├── src/
    │   ├── main.jsx            ← Routes
    │   ├── AuthContext.jsx
    │   ├── styles.css
    │   ├── lib/api.js
    │   ├── components/Layout.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Schedule.jsx
    │       ├── SpecialDays.jsx
    │       └── Settings.jsx
    ├── vite.config.js          ← Proxies /api -> http://localhost:4000
    └── package.json
```

---

## 🔁 Mapping: old PHP file → new file

| Old PHP | New equivalent |
|---|---|
| `login.php` | `frontend/src/pages/Login.jsx` + `backend/src/routes/auth.js` |
| `dashboard.php` | `frontend/src/pages/Dashboard.jsx` |
| `schedule.php` | `frontend/src/pages/Schedule.jsx` + `backend/src/routes/schedule.js` |
| `special_days.php` | `frontend/src/pages/SpecialDays.jsx` + `backend/src/routes/special-days.js` |
| `settings.php` | `frontend/src/pages/Settings.jsx` |
| `auth.php` | `backend/src/middleware/auth.js` (session-based) |
| `config/database.php` | `backend/src/db/pool.js` (mysql2 pool) |
| `api/ring_now.php`, `api/check_status.php`, `api/update_status.php` | `backend/src/routes/device.js` |
| `api/get_schedule.php`, `api/get_today.php` | `backend/src/routes/schedule.js` (`GET /` and `GET /today`) |
| `manual_ring.flag`, `esp32_status.flag` files | In-memory `state.js` (no files needed) |

---

## 🛠 Troubleshooting

- **`ER_ACCESS_DENIED_ERROR`** — wrong DB user/password in `backend/.env`. In XAMPP default it's `root` with empty password.
- **`Cannot find module …`** — run `npm install` again in that folder.
- **CORS error in browser** — make sure backend is running on `4000` and frontend on `5173`. Vite already proxies `/api`.
- **Login fails** — re-import `sql/database.sql` to recreate the seeded admin user.
- **ESP32 won't connect** — make sure your computer's firewall allows port 4000, and the ESP32 uses your computer's LAN IP (e.g. `http://192.168.1.50:4000/api/ring-now`).

---

## 🚀 Production build (optional)

```bash
cd frontend && npm run build      # outputs static files in frontend/dist
```

You can serve `frontend/dist` from any static host (Nginx, Apache, etc.) and keep the Node backend on port 4000 (use `pm2 start src/server.js` to keep it running).

Enjoy! 🔔
