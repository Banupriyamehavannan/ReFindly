# ReFindly — Lost & Found

A lost-and-found website built with a Django REST API and a React frontend.

The Home page explains the service. Visit `/lost_find` to browse listings;
found items appear before lost items. Posting an item opens a popup that asks
for a Student or Faculty account, checks the College ID, and then signs in or
registers in the same popup. Faculty self-registration is enabled.

## Backend (Django)

In PowerShell:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

In Command Prompt, use `cd /d backend` and run Python commands with
`.\.venv\Scripts\python.exe` instead.

### Admin panel

The local `backend/.env` file configures the admin login for development and is
excluded from version control. The backend reads it when it starts. In
deployment, configure `REFINDLY_ADMIN_USERNAME` and
`REFINDLY_ADMIN_PASSWORD` as server environment variables instead; keep these
credentials out of the frontend and source files.

Open **Admin Panel** in the website navigation and sign in with those values.
The dashboard shows student/faculty and lost/found/total item counts, and lets
the admin permanently delete a listing.

API: `http://127.0.0.1:8000/api/items/`

## Frontend (React + Vite)

Open another terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Website: `http://localhost:5173`

Photos are optional. Phone numbers are visible on listings, so share contact
details carefully. This is a local-development MVP; configure a production
`SECRET_KEY`, `DEBUG`, permissions, and deployment settings before publishing.
