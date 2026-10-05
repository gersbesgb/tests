# Indium Web

The accounts / license-key / receipts backend + dashboard for **Indium Macros**.
Plain Node.js + Express + SQLite — one process, one file database, nothing else to run.

## What this gives you

- Create-account / log-in with hashed passwords (bcrypt) and signed sessions (JWT)
- **GersBes** automatically gets admin access the *first* time that username registers
  (checked server-side — not something the UI can fake). Change this in `.env`.
- License keys: admin generates them (assigned to a user, or unassigned to redeem
  later), the desktop app validates a key over the network before it runs,
  and users can redeem an unassigned key onto their own account
- Receipts: admins add them manually; users see their own on the dashboard
- A themeable dashboard (same 7 color themes as the app) for all of the above
- A `/download` route that serves whatever `.exe` you drop into
  `public/downloads/`

## 1. Install

You need [Node.js](https://nodejs.org) 18+ installed.

```
npm install
```

## 2. Configure

```
cp .env.example .env
```

Open `.env` and set:

- `JWT_SECRET` — generate one with:
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_USERNAME` — defaults to `GersBes`. Whoever registers with this
  username first becomes admin; it can't be re-claimed after that.

## 3. Run it

```
npm start
```

Visit `http://localhost:3000`. Register the `GersBes` account first so it
becomes your admin account.

## 4. Put the app up for download

Build `Indium Macros.exe` (see the App folder's `build.bat`), then copy it into:

```
public/downloads/Indium Macros.exe
```

The "Download" button on the site and dashboard will serve whatever `.exe`
is in that folder.

## 5. Point the app at this site

In Indium Macros, open the **Account** tab and enter this site's URL (once
deployed) plus a license key from the dashboard, then hit Validate.

## Deploying: backend on Render, site on Cloudflare Pages

Cloudflare's own compute (Workers/Pages Functions) can't run this server —
it's serverless and can't run Express or the SQLite database this app
uses. So the API runs on Render, and Cloudflare hosts the static
`public/` site in front of it. They end up on two different domains,
which is already wired up in `public/app.js` (see below).

### 1. Backend → Render

1. Push this `Web/` folder to a GitHub repo (Render deploys from git).
2. On [render.com](https://render.com): **New → Web Service**, pick the
   repo. Render reads `render.yaml` automatically and fills in the build
   command (`npm install`), start command (`npm start`), and a generated
   `JWT_SECRET`. Otherwise set those by hand plus `ADMIN_USERNAME=GersBes`.
3. **Persistent storage matters here.** Render's *free* plan has no
   persistent disk — the SQLite file is wiped on every redeploy or
   restart, taking every account/key/receipt with it. `render.yaml`
   requests a small **Disk** (mounted at `/var/data`, `DATA_DIR` already
   points there) on the **Starter** plan (a few dollars/month). If you're
   just testing, the free plan is fine — just know it resets. For
   anything real, use the disk (or swap SQLite for Render's managed
   Postgres later — happy to do that migration if you want it).
4. Deploy. Note the URL Render gives you, e.g.
   `https://indium-web-xxxx.onrender.com` — that's your **API URL**.

### 2. Frontend → Cloudflare Pages

1. In `public/app.js`, set `API` near the top to your Render URL from
   step 1:
   ```js
   const API = "https://indium-web-xxxx.onrender.com";
   ```
2. In Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git**, point it at this repo with the **root directory
   set to `Web/public`**, no build command (it's static). Or skip git
   and drag-and-drop the `public/` folder in the same screen.
   (Or via CLI: `npx wrangler pages deploy Web/public`.)
3. Cloudflare gives you a URL like `https://indium-macros.pages.dev` —
   that's your **dashboard URL**, the one people actually visit.

### 3. Connect the two

- Back in Render's env vars, set `ALLOWED_ORIGIN` to your Pages URL
  (`https://indium-macros.pages.dev`) so the API only accepts requests
  from your site, not just anyone's page. Comma-separate if you add a
  custom domain later.
- In the Indium Macros app's **Account** tab: **License API URL** =
  your Render URL, **Dashboard URL** = your Cloudflare Pages URL.
- Drop your built `.exe` into `public/downloads/` **before** deploying
  to Pages (it's a static file, served straight from the CDN — not
  from Render), so the Download button works from the fast Cloudflare
  edge rather than Render's server.

### Alternative: everything on one host

If you'd rather skip the two-service split, just run `Web/` as-is on
Render (or Railway/Fly/a VPS) and let Express serve `public/` itself —
leave `API = ""` in `app.js` and don't bother with Cloudflare Pages at
all. Simpler, one moving part, no cross-origin config.

Either way, put real traffic behind HTTPS — plain HTTP sends passwords
in the clear. Render and Cloudflare both give you HTTPS for free.

## API reference (short version)

| Method | Path                      | Auth   | What |
|---|---|---|---|
| POST | `/api/auth/register`       | —      | Create an account |
| POST | `/api/auth/login`          | —      | Log in |
| GET  | `/api/auth/me`              | user   | Current account |
| POST | `/api/keys/validate`       | —      | **Called by the .exe.** `{key}` → `{valid, expires, username}` |
| GET  | `/api/keys/mine`           | user   | Your keys |
| POST | `/api/keys/redeem`         | user   | `{key}` → attach an unassigned key to your account |
| GET  | `/api/keys`                | admin  | All keys |
| POST | `/api/keys/generate`       | admin  | `{username?, note?, expiresAt?}` → new key |
| POST | `/api/keys/:id/revoke`     | admin  | Revoke a key |
| GET  | `/api/receipts/mine`       | user   | Your receipts |
| GET  | `/api/receipts`            | admin  | All receipts |
| POST | `/api/receipts`            | admin  | `{username, item, amount, note?}` → add a receipt |
