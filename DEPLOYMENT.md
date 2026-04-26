# Deploy 2BHK

Deploy the 2BHK app with:

- **Frontend:** Vercel (free)
- **Backend:** AWS Elastic Beanstalk (Node.js)
- **Database:** AWS RDS for MySQL

AWS gives you reliable DNS worldwide (e.g. works on Jio in India). Free tier applies for 12 months for new accounts; after that you pay for RDS and Beanstalk usage.

**Alternatives:**

- **Free tier:** [Railway](#alternative-railway-free-tier) for backend + MySQL (no credit card). Some ISPs (e.g. Jio) block Railway DNS — use [Render](#alternative-backend-on-render-when-railway-is-blocked) for the backend then.

---

## 1. Push your code to GitHub

- Create a repo on [GitHub](https://github.com/new) and push this project (e.g. `git remote add origin ...`, `git push -u origin main`).

---

## 2. AWS: MySQL database (RDS)

1. Sign in to [AWS Console](https://console.aws.amazon.com) and open **RDS**.
2. **Create database**:
   - **Engine:** MySQL 8.x.
   - **Templates:** Free tier (if eligible) or Dev/Test.
   - **Settings:** DB name e.g. `2bhk_db`, master username and password (save them).
   - **Instance:** e.g. db.t3.micro (free tier) or db.t4g.micro.
   - **Storage:** default (e.g. 20 GB).
   - **Connectivity:** VPC default, **Public access: Yes** (so you can run `createTables.js` from your machine and so Beanstalk can reach it; or use Private if you configure VPC/security groups). For simplicity we assume the RDS instance is reachable (public or from Beanstalk in same VPC).
   - **Security group:** Create new or use existing. **Inbound rules:** allow **MySQL/Aurora (3306)** from:
     - Your IP (for running `createTables.js` once), and
     - The security group of your Elastic Beanstalk environment (so the backend can connect). You can add the Beanstalk security group after creating the environment.
3. Create the database. Note the **Endpoint** (e.g. `xxx.xxxxxx.us-east-1.rds.amazonaws.com`), **port** (3306), **username**, and **password**.

---

## 3. AWS: Backend (Elastic Beanstalk)

1. Open **Elastic Beanstalk** in the AWS Console.
2. **Create Application**:
   - **Application name:** e.g. `2bhk`.
   - **Environment:** Create a new environment → **Web server environment**.
3. **Configure environment**:
   - **Platform:** Node.js (e.g. Node 18 or 20).
   - **Application code:** Upload your code (see below) or use **Sample application** first, then replace with your code.
4. **Uploading the backend:**
   - From your machine, create a ZIP of the **contents** of `node-backend` (not the folder itself): all files inside `node-backend` (e.g. `server.js`, `package.json`, `storage/`, `models/`, etc.) in the root of the ZIP. Or from repo root:
     ```bash
     cd node-backend && zip -r ../2bhk-backend.zip . && cd ..
     ```
   - In Beanstalk → **Upload and deploy** → choose `2bhk-backend.zip`.
5. **Environment variables** (Elastic Beanstalk → your environment → **Configuration** → **Software** → **Environment properties**):

   | Name | Value |
   |------|--------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Long random string (e.g. from a password generator) |
   | `DB_HOST` | RDS endpoint (e.g. `xxx.rds.amazonaws.com`) |
   | `DB_USER` | RDS master username |
   | `DB_PASSWORD` | RDS master password |
   | `DB_NAME` | `2bhk_db` (or the name you gave the database) |
   | `DB_PORT` | `3306` |
   | `FRONTEND_URL` | Your Vercel URL (e.g. `https://your-app.vercel.app`). Comma-separate multiple origins. |
   | `GOOGLE_AUTH_CLIENT_ID` | Your Google OAuth client ID |
   | `GOOGLE_AUTH_CLIENT_SECRET` | Your Google OAuth client secret |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
   | `API_BASE_URL` | Your Beanstalk URL (see below) — set after first deploy |

6. **Deploy**. After deploy, open the environment URL (e.g. `http://2bhk-env.xxx.us-east-1.elasticbeanstalk.com`). For HTTPS and a stable URL you can add a **Custom domain** and an SSL certificate (ACM) in the Beanstalk or Load Balancer config.
7. Set **API_BASE_URL** in environment properties to that URL (e.g. `https://your-env.elasticbeanstalk.com` or your custom domain), then **Apply** and redeploy if needed.

**RDS security group:** Ensure the RDS instance’s security group allows inbound MySQL (3306) from the Beanstalk environment’s security group (or from 0.0.0.0/0 only for testing; restrict in production).

---

## 4. Create tables (once)

From your machine, using the RDS endpoint and credentials:

```bash
cd node-backend
DB_HOST=<rds-endpoint> DB_USER=<rds-user> DB_PASSWORD=<rds-password> DB_NAME=2bhk_db DB_PORT=3306 node storage/createTables.js
```

Replace placeholders with your RDS values. Run once per database.

For phantom-owner rollout, prefer this sequence:

1. **Schema-only rollout (default):** run `createTables.js` without backfill flags.
2. **Backfill dry-run:** set `PHANTOM_OWNER_BACKFILL_LEGACY=true` and `PHANTOM_OWNER_BACKFILL_DRY_RUN=true` to inspect impact safely.
3. **Live backfill (optional):** rerun with `PHANTOM_OWNER_BACKFILL_LEGACY=true` and `PHANTOM_OWNER_BACKFILL_DRY_RUN=false` (optionally set `PHANTOM_OWNER_BACKFILL_LIMIT` for batching).

Example dry-run:

```bash
cd node-backend
DB_HOST=<rds-endpoint> DB_USER=<rds-user> DB_PASSWORD=<rds-password> DB_NAME=2bhk_db DB_PORT=3306 PHANTOM_OWNER_BACKFILL_LEGACY=true PHANTOM_OWNER_BACKFILL_DRY_RUN=true PHANTOM_OWNER_BACKFILL_LIMIT=200 node storage/createTables.js
```

---

## 5. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (e.g. with GitHub).
2. **Add New** → **Project** → import your 2BHK repo.
3. **Root Directory:** `react-frontend`
4. **Build Command:** `npm run build`  
   **Output Directory:** `build`
5. **Environment Variables:**
   - `REACT_APP_API_URL` = your **AWS backend URL** (e.g. `https://your-env.elasticbeanstalk.com` or custom domain). No trailing slash.
   - `REACT_APP_GOOGLE_AUTH_CLIENT_ID` = your Google OAuth client ID.
6. Deploy and copy the frontend URL (e.g. `https://2bhk-xxx.vercel.app`).

---

## 6. CORS and Google OAuth

1. **Elastic Beanstalk** → your environment → **Configuration** → **Software** → **Environment properties**: set `FRONTEND_URL` to your Vercel URL. Redeploy if needed.
2. **Google Cloud Console** → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID:
   - **Authorized JavaScript origins:** add your Vercel URL.
   - **Authorized redirect URIs:** add the same if your app uses it.

---

## 7. Quick check

- Open your Vercel URL. List properties, sign up / log in (email or Google).
- If something fails: check browser console and Network tab; check Beanstalk logs (Logs → Request Logs / Full Logs); ensure `FRONTEND_URL` and `REACT_APP_API_URL` match your deployed URLs and RDS is reachable from Beanstalk.

---

## Summary (AWS)

| Part     | Service           | Notes |
|----------|-------------------|--------|
| Frontend | Vercel            | Root: `react-frontend` |
| Backend  | AWS Elastic Beanstalk | Node.js; deploy ZIP of `node-backend` contents |
| Database | AWS RDS MySQL     | Free tier 12 months (if eligible) |
| Env (API)| Beanstalk         | `DB_*` from RDS, `JWT_SECRET`, `FRONTEND_URL`, `API_BASE_URL`, Google, Cloudinary |
| Env (UI) | Vercel            | `REACT_APP_API_URL`, `REACT_APP_GOOGLE_AUTH_CLIENT_ID` |

---

## Alternative: Railway (free tier)

If you prefer a free backend + database without AWS:

1. At [railway.app](https://railway.app), create a **New Project**.
2. **Add MySQL** (Add Plugin → MySQL). Note `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`.
3. **Add Service** → **GitHub Repo** → select the 2BHK repo.
4. **Web Service:** Root Directory `node-backend`, Build `npm install`, Start `npm start`.
5. **Variables:** Add `NODE_ENV`, `PORT` (optional), `JWT_SECRET`, `DB_HOST` (= MYSQLHOST), `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `FRONTEND_URL`, `API_BASE_URL` (after generating domain), Google and Cloudinary vars.
6. **Settings** → **Networking** → **Generate Domain**. Set `API_BASE_URL` to that URL.
7. Run `node storage/createTables.js` locally with Railway MySQL credentials (see section 4 style).
8. In Vercel set `REACT_APP_API_URL` to the Railway backend URL; in Railway set `FRONTEND_URL` to the Vercel URL.

**Note:** Some ISPs (e.g. Jio in India) block Railway DNS. If users report “cannot reach backend,” use Render (below) for the backend and keep MySQL on Railway.

---

## Alternative: Backend on Render (when Railway is blocked)

When Railway’s domain is blocked for some users (e.g. Jio in India), keep **MySQL on Railway** and run only the **Node backend on Render**.

1. **Railway:** New Project → Add MySQL only. Note MySQL variables.
2. **Render:** [render.com](https://render.com) → **New** → **Web Service** → connect GitHub repo.
   - **Root Directory:** `node-backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Add the same variables as in the AWS table above; set `DB_*` from Railway MySQL. Set `FRONTEND_URL` to your Vercel URL. After deploy, set `API_BASE_URL` to the Render service URL (e.g. `https://2bhk-api.onrender.com`).
3. Run `storage/createTables.js` locally with Railway MySQL credentials.
4. **Vercel:** Set `REACT_APP_API_URL` to the **Render** URL. Redeploy. **Render:** Set `FRONTEND_URL` to the Vercel URL.

Render free tier: services spin down after ~15 min idle; first request may take 30–60 s (cold start).

---

## Other backend options

- **Fly.io** — [fly.io](https://fly.io): Deploy from `node-backend`; same env vars; MySQL on Railway or elsewhere. URL like `https://your-app.fly.dev`.
- **Koyeb** — [koyeb.com](https://www.koyeb.com): Web Service, Root Directory `node-backend`, same env vars. URL like `https://your-app.koyeb.app`.

In all cases, set Vercel’s `REACT_APP_API_URL` to the backend URL and the backend’s `FRONTEND_URL` to your Vercel URL.
