# Deploy 2BHK (free tier)

Deploy the React frontend and Node backend for free:

- **Frontend:** Vercel (free)
- **Backend + MySQL:** Railway (free tier with monthly credit)

No paid database required.

---

## 1. Push your code to GitHub

If you haven’t already:

- Create a new repo on [GitHub](https://github.com/new).
- Push this project (e.g. `git remote add origin ...`, `git push -u origin main`).

---

## 2. Create a project on Railway (backend + database)

Railway’s free tier includes a monthly credit that’s enough for a small Node app and MySQL.

1. Sign up at [railway.app](https://railway.app) (e.g. with GitHub).
2. **New Project**.
3. **Add MySQL** (or **Add Plugin** → **MySQL**):
   - Add a MySQL service. Railway will create the database and expose variables.
4. After MySQL is created, open the **MySQL** service → **Variables** (or **Connect**).
   - Note: `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`.  
   - Your backend will use these as `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.
5. In the same project, **Add Service** → **GitHub Repo**:
   - Connect the 2BHK repo.
   - Select the repo and add a **Web Service** (not a Cron or Worker).
6. Configure the new **Web Service**:
   - **Root Directory:** `node-backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Watch Paths:** leave default (or `node-backend`) so only backend changes trigger deploys.

7. **Variables** for the **Web Service** (not the MySQL service):
   - **Important:** Railway does **not** inject the MySQL service’s variables into your backend. You must add the database variables to the **backend Web Service** yourself.
   - Open the **MySQL** service → **Variables** tab and note the values. Then open your **backend Web Service** → **Variables** and add them. The app accepts either `DB_*` or Railway’s `MYSQL*` names.
   - Add:

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `PORT` | Leave unset (Railway sets this) or `5000` if asked for a target port |
   | `JWT_SECRET` | A long random string (e.g. from a password generator). Do not use the default from .env. |
   | `DB_HOST` or `MYSQLHOST` | From MySQL service → Variables → `MYSQLHOST` |
   | `DB_USER` or `MYSQLUSER` | From MySQL service → `MYSQLUSER` |
   | `DB_PASSWORD` or `MYSQLPASSWORD` | From MySQL service → `MYSQLPASSWORD` |
   | `DB_NAME` or `MYSQLDATABASE` | From MySQL service → `MYSQLDATABASE` (often `railway`) |
   | `DB_PORT` or `MYSQLPORT` | From MySQL service → `MYSQLPORT` (often `3306`) |
   | `FRONTEND_URL` | Set after Vercel deploy (e.g. `https://your-app.vercel.app`) |
   | `GOOGLE_AUTH_CLIENT_ID` | Your Google OAuth client ID |
   | `GOOGLE_AUTH_CLIENT_SECRET` | Your Google OAuth client secret |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

   Copy each value from the MySQL service’s Variables tab into the backend service. If you use Railway variable references (e.g. `${{MySQL.MYSQLHOST}}`), you can name the variable either `DB_HOST` or `MYSQLHOST`; the app reads both.

8. **Settings** → **Networking** → **Generate Domain** so the backend gets a public URL (e.g. `https://2bhk-api-production-xxxx.up.railway.app`).
9. Add one more variable to the **Web Service**:
   - `API_BASE_URL` = that same public URL (e.g. `https://2bhk-api-production-xxxx.up.railway.app`).

---

## 3. Create tables on the production MySQL

Use the same DB credentials Railway gave you. From your machine:

```bash
cd node-backend
# Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT to Railway MySQL values (e.g. in .env), then:
node storage/createTables.js
```

Or inline (replace with your Railway MySQL values):

```bash
cd node-backend
DB_HOST=containers-us-west-xxx.railway.app DB_USER=root DB_PASSWORD=xxx DB_NAME=railway DB_PORT=3306 node storage/createTables.js
```

You only need to run this once per database.

---

## 4. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (e.g. with GitHub).
2. **Add New** → **Project** → import your 2BHK repo.
3. Configure:
   - **Root Directory:** `react-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. **Environment Variables:**
   - `REACT_APP_API_URL` = your Railway backend URL (e.g. `https://2bhk-api-production-xxxx.up.railway.app`) — no trailing slash.
   - `REACT_APP_GOOGLE_AUTH_CLIENT_ID` = your Google OAuth client ID.
5. **Deploy**. Copy the frontend URL (e.g. `https://2bhk-xxx.vercel.app`).

---

## 5. Point backend to frontend (CORS)

1. In **Railway** → your **backend Web Service** → **Variables**:
   - Set `FRONTEND_URL` to your Vercel URL (e.g. `https://2bhk-xxx.vercel.app`).
2. Redeploy the backend if needed (Railway usually redeploys when variables change).

---

## 6. Google OAuth (production origins)

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID.
2. **Authorized JavaScript origins:** add your Vercel URL (e.g. `https://2bhk-xxx.vercel.app`).
3. **Authorized redirect URIs:** add the same URL if your app uses it for redirects.
4. Save.

---

## 7. Quick check

- Open your Vercel URL. Use the app: list properties, open a listing, sign up / log in (email or Google).
- If something fails:
  - Browser console and Network tab for CORS or wrong API URL.
  - Railway logs for the backend service.
  - Ensure `FRONTEND_URL` and `REACT_APP_API_URL` match your deployed URLs.

---

## Summary

| Part      | Service | Notes |
|-----------|---------|--------|
| Frontend  | Vercel  | Root: `react-frontend` |
| Backend   | Railway | Root: `node-backend`, public domain generated |
| Database  | Railway | MySQL plugin in same project |
| Env (API) | Railway | `DB_*` from MySQL service, `JWT_SECRET`, `FRONTEND_URL`, `API_BASE_URL`, Google, Cloudinary |
| Env (UI)  | Vercel  | `REACT_APP_API_URL`, `REACT_APP_GOOGLE_AUTH_CLIENT_ID` |

---

## Alternative: Render (backend) + Railway (MySQL only)

If you prefer Render for the backend:

1. Create **MySQL on Railway** (steps above: New Project → Add MySQL). Copy `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.
2. Deploy **backend on Render**: New → Web Service → repo, Root Directory `node-backend`, Build `npm install`, Start `npm start`. Add the same env vars as in the table above, with `DB_*` from Railway.
3. Run `node storage/createTables.js` locally with those DB credentials.
4. Deploy **frontend on Vercel** as in section 4 and set `FRONTEND_URL` and `API_BASE_URL` on Render to your Vercel and Render URLs.

Both options are free for a small MVP.
