# Deploy 2BHK (free tier)

Deploy the React frontend and Node backend for free using **Vercel** (frontend) and **Render** (backend). You’ll need a **MySQL** database (e.g. **PlanetScale** or **Railway** free tier).

---

## 1. Push your code to GitHub

If you haven’t already:

- Create a new repo on [GitHub](https://github.com/new).
- Push this project (e.g. `git remote add origin ...`, `git push -u origin main`).

---

## 2. Create a production MySQL database

Choose one:

### Option A: PlanetScale (free tier)

1. Sign up at [planetscale.com](https://planetscale.com).
2. Create a new database (e.g. `2bhk-db`).
3. In the dashboard, open **Connect** → **Connect with** → **General**.
4. Copy **Host**, **Username**, **Password**, and use your DB name (e.g. `2bhk-db`). You’ll need these for the backend env vars: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
5. (Optional) If PlanetScale shows a **Branch** and **Connect** string, use the host/user/password from that.

### Option B: Railway (free tier)

1. Sign up at [railway.app](https://railway.app).
2. **New Project** → **Add MySQL**.
3. After it’s created, open the MySQL service → **Variables** or **Connect**.
4. Copy host, user, password, database (often `railway`). Set `DB_PORT=3306` if shown.

### Create tables on the production DB

From your machine, set the production DB credentials and run the table creation script once. The script reads `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` from `node-backend/.env` (or from the environment).

```bash
cd node-backend
# Put production DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env (or export them), then:
node storage/createTables.js
```

Or inline:

```bash
cd node-backend
DB_HOST=your-db-host DB_USER=user DB_PASSWORD=secret DB_NAME=2bhk_db node storage/createTables.js
```

---

## 3. Deploy the backend (Render)

1. Go to [render.com](https://render.com) and sign up (e.g. with GitHub).
2. **New** → **Web Service**.
3. Connect your GitHub repo and select the **2BHK** repository.
4. Configure:
   - **Name:** e.g. `2bhk-api`
   - **Root Directory:** `node-backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment** → **Add Environment Variable**. Add:

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | A long random string (e.g. from a password generator). **Do not** use the default from .env. |
   | `FRONTEND_URL` | Your frontend URL (you’ll set this after Vercel, e.g. `https://your-app.vercel.app`) |
   | `DB_HOST` | Production MySQL host |
   | `DB_USER` | Production MySQL user |
   | `DB_PASSWORD` | Production MySQL password |
   | `DB_NAME` | Production MySQL database name |
   | `GOOGLE_AUTH_CLIENT_ID` | Same as in your .env (Google OAuth client ID) |
   | `GOOGLE_AUTH_CLIENT_SECRET` | Same as in your .env |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
   | `API_BASE_URL` | Your Render backend URL (e.g. `https://2bhk-api.onrender.com`) — same as the URL Render gives after deploy |

6. **Create Web Service**. Wait for the first deploy.
7. Copy the service URL (e.g. `https://2bhk-api.onrender.com`). You’ll use it as `REACT_APP_API_URL` and for `API_BASE_URL` / `FRONTEND_URL` in a moment.

Note: On the free tier, the service may sleep after inactivity; the first request after sleep can be slow.

---

## 4. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (e.g. with GitHub).
2. **Add New** → **Project** → import your GitHub repo.
3. Configure:
   - **Root Directory:** set to `react-frontend` (click **Edit** and choose the `react-frontend` folder).
   - **Framework Preset:** Create React App (or leave as detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. **Environment Variables** → add:

   | Key | Value |
   |-----|--------|
   | `REACT_APP_API_URL` | Your Render backend URL (e.g. `https://2bhk-api.onrender.com`) — no trailing slash |
   | `REACT_APP_GOOGLE_AUTH_CLIENT_ID` | Your Google OAuth client ID (same as backend) |

5. **Deploy**. When it’s done, copy the frontend URL (e.g. `https://2bhk-xxx.vercel.app`).

---

## 5. Point backend to frontend (CORS and API base URL)

1. In **Render** → your backend service → **Environment**:
   - Set **`FRONTEND_URL`** to your Vercel URL (e.g. `https://2bhk-xxx.vercel.app`). This is used for CORS.
   - Set **`API_BASE_URL`** to the same Render URL (e.g. `https://2bhk-api.onrender.com`) if the backend uses it for building image URLs.
2. **Save Changes** so Render redeploys.

---

## 6. Google OAuth (production origins)

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID.
2. Under **Authorized JavaScript origins**, add:
   - `https://your-app.vercel.app` (your real Vercel URL)
3. Under **Authorized redirect URIs**, add any redirect URL your app uses (e.g. `https://your-app.vercel.app` or the one shown in your login flow).
4. Save.

---

## 7. Quick check

- Open your Vercel URL. You should see the 2BHK app.
- Try: search properties, open a listing, sign up / log in (email and Google).
- If login or API calls fail, check:
  - Browser console and Network tab for CORS or 404 errors.
  - Render logs for backend errors.
  - `FRONTEND_URL` and `REACT_APP_API_URL` match your deployed URLs.

---

## Summary

| Part | Service | URL / Root |
|------|---------|------------|
| Frontend | Vercel | Root: `react-frontend` |
| Backend | Render | Root: `node-backend` |
| Database | PlanetScale or Railway | Set `DB_*` on Render |
| Env | Render | `JWT_SECRET`, `FRONTEND_URL`, `API_BASE_URL`, DB, Google, Cloudinary |
| Env | Vercel | `REACT_APP_API_URL`, `REACT_APP_GOOGLE_AUTH_CLIENT_ID` |

If `createTables.js` doesn’t use env vars yet, you can add `require('dotenv').config()` at the top and use `process.env.DB_HOST`, `process.env.DB_USER`, `process.env.DB_PASSWORD`, `process.env.DB_NAME` (and `process.env.DB_PORT` if needed) so one script works for both local and production.
