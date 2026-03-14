# Backend only — VPS (API on the VM)

Deploy **only the Node API** on your VPS. The React app can stay elsewhere (e.g. static hosting); the browser calls this API using `VITE_API_URL=https://api.yourdomain.com/api`.

**Repo (example):** [github.com/aiihelperr127-lab/traceback](https://github.com/aiihelperr127-lab/traceback)  
If the repo is a zip, unzip on the server so you have the folder that contains `server/`, `shared/`, and root `package.json`.

---

## 1. DNS

Point a hostname at the VPS, e.g.:

| Name | Type | Value   |
|------|------|--------|
| `api` | A    | VPS IP |

Example API base URL: `https://api.yourdomain.com`

---

## 2. SSH and packages

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs nginx
npm install -g pm2
```

---

## 3. Code on the server

```bash
mkdir -p /var/www && cd /var/www

# If full git tree:
git clone https://github.com/aiihelperr127-lab/traceback.git traceback
cd traceback
# If you only have a zip in the repo:
# unzip "ctf-platform*.zip" && cd into the folder that has package.json + server/

# Working directory must be monorepo root (has client/, server/, shared/, package.json)
cd ctf-platform   # or whatever your root folder is named
```

---

## 4. Secrets (never commit these)

**A) Service account (required)**

```bash
nano server/config/serviceAccountKey.json
# paste Firebase JSON, save
chmod 600 server/config/serviceAccountKey.json
```

**B) Environment — monorepo root `.env`**

```env
PORT=4000
NODE_ENV=production

FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Production: your real frontend origin(s), comma-separated
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

You do **not** need `VITE_*` on the server for API-only deploy.  
Client app build (elsewhere) must use `VITE_API_URL=https://api.yourdomain.com/api`.

---

## 5. Install (backend + shared workspace)

From monorepo root:

```bash
npm install
```

No need to run `npm run build:client` if you only care about the API.  
(Optional: build client later if you want Express to serve the SPA from the same host.)

---

## 6. PM2 — start API

```bash
cd server
pm2 start server.js --name ctf-api
pm2 save
pm2 startup
# run the command PM2 prints so it survives reboot
```

Check:

```bash
curl -s http://127.0.0.1:4000/api/health
# expect {"status":"ok",...}
```

---

## 7. Nginx — HTTPS reverse proxy (API host)

```bash
nano /etc/nginx/sites-available/ctf-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
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
ln -sf /etc/nginx/sites-available/ctf-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com
```

---

## 8. Firebase Console

- **Authentication → Authorized domains:** add `api.yourdomain.com` and your frontend domain.
- Deploy indexes/rules from your laptop:

```bash
cd ctf-platform
npx firebase-tools deploy --only firestore:indexes,firestore:rules
```

---

## 9. Update after `git pull`

```bash
cd /var/www/traceback/ctf-platform
git pull
npm install
pm2 restart ctf-api
```

---

## 10. Firewall (optional)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## Checklist

- [ ] `serviceAccountKey.json` present, mode `600`
- [ ] `.env` has `CORS_ORIGINS` matching the real frontend
- [ ] `curl https://api.yourdomain.com/api/health` OK
- [ ] Frontend `.env` build uses `VITE_API_URL=https://api.yourdomain.com/api`
