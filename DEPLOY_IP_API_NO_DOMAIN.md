# Backend API by IP only (no domain)

## On the VPS

### 1. API already on port 4000 (PM2)

```bash
cd /var/www/traceback/ctf-platform/server
pm2 start server.js --name ctf-api || pm2 restart ctf-api
curl -s http://127.0.0.1:4000/api/health
```

### 2. Nginx on port 80 → same API (optional but recommended)

So the browser uses **`http://YOUR_VPS_IP/api`** instead of `:4000`.

```bash
apt install -y nginx
nano /etc/nginx/sites-available/ctf-api-ip
```

Paste (replace `YOUR_VPS_IP` with e.g. `187.127.130.81`):

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/ctf-api-ip /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Test from your PC browser or:

```bash
curl -s http://YOUR_VPS_IP/api/health
```

HTTPS is not set up here (needs a domain for normal certificates).

---

## Frontend in this project

The app **bakes** the API URL at **build** time (`VITE_API_URL`).

### Local dev (PC)

In **`ctf-platform/.env`** (repo root):

```env
VITE_API_URL=http://YOUR_VPS_IP/api
```

Leave **`CORS_ORIGINS` empty** on the server while testing so any origin can call the API, or set:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Restart API after changing server `.env`:

```bash
pm2 restart ctf-api
```

Then:

```bash
npm run dev
```

### Production build (static files)

Same line in `.env`, then:

```bash
npm run build:client
```

Upload **`client/dist/`** to your host. Every API call goes to `http://YOUR_VPS_IP/api/...`.

### Firebase Auth

In **Firebase Console → Authentication → Settings → Authorized domains**, add:

- `localhost` (already there)
- Your **frontend** domain if not localhost (e.g. Hostinger site)

You usually **cannot** add a raw IP as an authorized domain for Firebase Hosting-style rules; if login breaks, put the frontend on a normal domain or use localhost for dev.

### “Invalid or expired token” (API returns 401)

The VPS verifies the browser’s Firebase ID token with **Admin SDK**. Fix in this order:

1. **Same Firebase project**  
   On the VPS, open `server/config/serviceAccountKey.json` and check `"project_id"`.  
   It must match **`VITE_FIREBASE_PROJECT_ID`** in the app that signs users in (your `ctf-platform/.env`).  
   If you copied an old key from another project, download a new key: **Firebase Console → Project settings → Service accounts → Generate new private key** for **this** project.

2. **Restart API** after replacing the key: `pm2 restart ctf-api`

3. **Client retry** (already in app): first 401 triggers a fresh token; if it still fails, the project/key mismatch is almost certain.

4. **VPS logs**: `pm2 logs ctf-api` — look for `[auth] verifyIdToken:` (e.g. `auth/argument-error` often means bad/corrupt token; wrong project shows up as verify failures too).

---

## Summary

| Where        | Value |
|-------------|--------|
| Nginx       | `http://VPS_IP` → proxy → `127.0.0.1:4000` |
| Frontend `.env` | `VITE_API_URL=http://VPS_IP/api` |
| Server `.env`   | `CORS_ORIGINS` = your frontend origin(s), or empty for wide open (dev only) |
