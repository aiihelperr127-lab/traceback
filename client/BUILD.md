# Production build (client)

## 1. Environment

Vite reads **`ctf-platform/.env`** (parent of `client/`). Before building for production:

| Variable | Production value |
|----------|------------------|
| `VITE_API_URL` | **HTTPS** API base if the site is HTTPS, e.g. `https://api.yourdomain.com/api`. Plain `http://IP/api` will be **blocked** by the browser from an HTTPS page. |
| `VITE_FIREBASE_*` | Same as Firebase Console web app |

**Do not** put `NODE_ENV=production` in that shared `.env` — Vite will warn and it can confuse local client builds. Set `NODE_ENV=production` only on the **server** (systemd, PM2, Docker).

## 2. Build

```bash
cd ctf-platform/client
npm ci   # or npm install
npm run build
```

Output: **`client/dist/`** — deploy this folder to static hosting (Firebase Hosting, Hostinger, nginx, etc.).

## 3. SPA routing

Configure the host so all routes serve `index.html` (Firebase `rewrites`, nginx `try_files`, etc.).

## 4. CORS

Backend `CORS_ORIGINS` must include your frontend origin (e.g. `https://yourdomain.com`).
