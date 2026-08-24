# Society Maintenance Tracker

A platform for apartment societies: residents raise and track maintenance
complaints with photos, admins manage them through a status/priority
workflow, and everyone stays informed via a notice board and email.

## Stack
- **Backend:** Node.js + Express + PostgreSQL, JWT auth, Multer (photo
  uploads), Nodemailer (email)
- **Frontend:** React (Vite) + React Router + Axios

## Project structure
```
society-tracker/
  backend/     Express API, PostgreSQL schema
  frontend/    React app
```

## 1. Database setup
1. Create a PostgreSQL database (locally, or a free tier on Render/Railway/Neon).
2. Run the schema:
   ```bash
   psql <your-connection-string> -f backend/schema.sql
   ```

## 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, SMTP_* values
npm run dev                # or: npm start
```
Runs on `http://localhost:5000` by default.

### Email (SMTP)
Any free-tier SMTP provider works — Gmail with an App Password, Brevo,
Mailtrap, etc. Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in
`.env`. If left blank, the app still works — emails just fail silently
(logged to console) and won't block API requests.

## 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env      # set VITE_API_URL to your backend URL
npm run dev
```
Runs on `http://localhost:5173`.

## 4. Using the app
1. Register two accounts: one with role `resident`, one with role `admin`.
2. Log in as the resident → raise a complaint (with an optional photo).
3. Log in as the admin → see it in the admin dashboard, set priority,
   change status (each change is logged with a note + timestamp), post
   notices, view the stats dashboard.

## API reference

| Method | Endpoint | Who | Description |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | `{ name, email, password, role }` |
| POST | `/api/auth/login` | anyone | `{ email, password }` → `{ token, user }` |
| POST | `/api/complaints` | resident | multipart form: `category, description, photo` |
| GET | `/api/complaints` | both | resident: own only. admin: all, filters `?category=&status=&from=&to=` |
| GET | `/api/complaints/:id/history` | both (owner or admin) | full status timeline |
| PATCH | `/api/complaints/:id/status` | admin | `{ status, note }` |
| PATCH | `/api/complaints/:id/priority` | admin | `{ priority }` |
| GET | `/api/notices` | both | pinned-important first |
| POST | `/api/notices` | admin | `{ title, body, is_important }` |
| GET | `/api/dashboard` | admin | counts by status/category, overdue count |

All authenticated routes require `Authorization: Bearer <token>`.

## Database schema
See `backend/schema.sql`. Key design point: `complaint_history` is a
separate append-only table (`complaint_id, old_status, new_status,
actor_id, note, created_at`) — every status change, including creation,
inserts a row here instead of overwriting the complaint. This is what
gives residents/admins the full audit trail.

## Overdue detection
Not a stored column — computed at query time:
`status != 'Resolved' AND created_at < NOW() - INTERVAL 'OVERDUE_DAYS days'`.
`OVERDUE_DAYS` is configurable via `.env`. This avoids needing a cron job
to keep a flag in sync; the admin complaint list always sorts overdue
items first.

## Deploying
- **Backend:** Render or Railway (Node web service) + their free
  PostgreSQL add-on.
- **Frontend:** Vercel — set `VITE_API_URL` to your deployed backend URL.
- Update `CORS`/`VITE_API_URL` to match your deployed domains.

## Live URLs
- Frontend: https://society-tracker-frontend-o1h8.onrender.com
- Backend API: https://society-tracker-backend-m1wy.onrender.com
- GitHub repo: https://github.com/Ananyachaurasia/society-maintenance-tracker
