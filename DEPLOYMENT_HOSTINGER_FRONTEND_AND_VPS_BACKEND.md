# TracebackCTF -- Hostinger Frontend + VPS Backend (Split Deployment)

This guide deploys **the React app as static files on Hostinger** (your main domain) and **the Node.js API on a Hostinger VPS**. It matches this repo’s layout.

**CSBC (API on IP only, frontend HTTPS):** **[PRODUCTION_CONNECT_CSBC.md](./PRODUCTION_CONNECT_CSBC.md)** — proxy `/api` on Hostinger → `http://VPS_IP:4000/api`, build with `VITE_API_URL=https://traceback-ctf-csbc.sanjivaniuniversity.com/api`.

---

## 1. What you are deploying (folder structure)

Your project is a **monorepo**. Only these paths matter for production:

| Path | Role |
|------|------|
| **`ctf-platform/`** | Monorepo root. Contains root `package.json`, root **`.env`**, and workspaces. |
| **`ctf-platform/client/`** | React (Vite) app. **Build output** is what you put on Hostinger. |
| **`ctf-platform/client/dist/`** | **Created by build.** Upload **everything inside this folder** to Hostinger (not the `dist` folder name itself unless your host expects it -- usually you upload *contents* into `public_html`). |
| **`ctf-platform/server/`** | Express API. Runs on the **VPS** with PM2. |
| **`ctf-platform/shared/`** | Shared code; included when you `npm install` at root. |
| **`ctf-platform/server/config/serviceAccountKey.json`** | Firebase Admin key. **VPS only.** Never commit. |

Conceptual flow:

```
Browser (https://yourdomain.com)
  -> loads static files from Hostinger (client/dist)
  -> calls API at https://api.yourdomain.com/api/... (your VPS)

VPS (Node + Nginx)
  -> Express on port 4000
  -> Nginx terminates HTTPS and proxies to Express
```

---

## 2. DNS (do this first)

You need **two names** (examples):

| Record | Type | Value | Purpose |
|--------|------|--------|--------|
| `@` or `www` | A | Hostinger **shared hosting IP** (or parking IP Hostinger gives you) | Main site (frontend) |
| `api` | A | **VPS public IP** | Backend API |

Small steps:

1. Log in to **Hostinger** -> **Domains** -> select your domain -> **DNS / DNS Zone**.
2. Add an **A record**: **Name** `api`, **Points to** your **VPS IP**, TTL default.
3. Ensure **www** and **@** point where Hostinger says your **website** should point (often an IP or CNAME to Hostinger hosting).  
4. Wait 5–30 minutes (sometimes up to 48h). Check with:  
   `ping api.yourdomain.com` (should show VPS IP).

---

## 3. Backend on Hostinger VPS (small steps)

### 3.1 Open a terminal to the VPS

1. From your PC, open PowerShell or Terminal.
2. SSH in (Hostinger panel shows IP and root password or SSH key):

   ```bash
   ssh root@YOUR_VPS_IP
   ```

3. Accept the host key if asked.

### 3.2 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 3.4 Install Nginx and PM2

```bash
sudo apt install -y nginx
sudo npm install -g pm2
nginx -v
pm2 -v
```

### 3.5 Create a directory for the app

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
```

### 3.6 Put the code on the VPS (Git)

Replace the URL with **your** repo (private repos need SSH key or token on the VPS).

```bash
git clone https://github.com/YOU/ctf-platform.git ctf-app
cd ctf-app
```

If your repo root **is** the folder that contains `client`, `server`, `shared`:

```bash
cd ctf-app   # or cd ctf-app/ctf-platform if you nested it
ls
# You should see: client  server  shared  package.json
```

### 3.7 Create `.env` on the VPS (monorepo root)

Path must be the same folder as root `package.json` (so `server/server.js` can load it via `../.env`).

```bash
nano .env
```

Paste (replace placeholders). **Important:** for split hosting you still build the **client** elsewhere with `VITE_API_URL`; the server only needs server-side vars + Firebase if you use env for admin (your project uses `serviceAccountKey.json` for Admin SDK).

Minimal VPS `.env` example:

```env
PORT=4000
NODE_ENV=production

# Optional if your server reads these; Admin SDK uses serviceAccountKey.json
FIREBASE_PROJECT_ID=your-project-id
```

Add **Vite vars only if you ever build on the VPS**; for split deploy you build the client on your PC with `VITE_API_URL` pointing to the API URL (next section).

### 3.8 Add Firebase service account key

1. On your PC: Firebase Console -> Project settings -> Service accounts -> Generate new private key -> JSON file.
2. Copy that file to the VPS:

   ```bash
   # On your PC (example SCP):
   scp serviceAccountKey.json root@YOUR_VPS_IP:/var/www/ctf-app/server/config/
   ```

3. On the VPS:

   ```bash
   chmod 600 /var/www/ctf-app/server/config/serviceAccountKey.json
   ```

### 3.9 Install dependencies and (optional) build client on VPS

API only needs install at root:

```bash
cd /var/www/ctf-app
npm install
```

You **do not** have to run `build:client` on the VPS if the frontend is hosted on Hostinger. The server will still try to serve `client/dist`; if that folder is missing, **only `/api/*` matters** for your split setup. Optionally create an empty `client/dist` with a dummy `index.html` to avoid errors, or ignore static errors if no one hits the VPS root URL.

### 3.10 Start API with PM2

```bash
cd /var/www/ctf-app/server
pm2 start server.js --name ctf-api
pm2 save
pm2 startup
# Run the command PM2 prints so PM2 starts on reboot
```

Test locally on the VPS:

```bash
curl http://127.0.0.1:4000/api/health
```

You should see JSON `status: ok`.

### 3.11 Nginx for **api** subdomain only

```bash
sudo nano /etc/nginx/sites-available/ctf-api
```

Paste (replace `api.yourdomain.com`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/ctf-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.12 HTTPS on the VPS (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

After this, API base URL is:

`https://api.yourdomain.com/api`

Test:

```bash
curl https://api.yourdomain.com/api/health
```

### 3.13 Firewall (optional but recommended)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 4. Frontend on Hostinger (main domain) -- small steps

The frontend is **static files** from **`client/dist/`** after a production build. The build must know the **full API URL**.

### 4.1 On your PC: open the monorepo root

Example:

```text
d:\...\ctf-platform
```

Confirm you see `client`, `server`, `package.json`.

### 4.2 Create or edit `.env` at monorepo root

**Critical for split deploy:** `VITE_API_URL` must be the **full HTTPS URL** of your API (no trailing slash after `/api`).

```env
VITE_API_URL=https://api.yourdomain.com/api
```

Plus all Firebase client variables (same as local dev):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`client/vite.config.js` uses `envDir: '..'`, so root `.env` is correct.

### 4.3 Build the client

From monorepo root:

```bash
npm install
npm run build:client
```

### 4.4 What to upload

Open folder:

```text
ctf-platform/client/dist/
```

You should see at least:

- `index.html`
- folder `assets/` (JS/CSS)

### 4.5 Hostinger hPanel -- File Manager

1. Log in **Hostinger** -> **Websites** -> **Manage** -> **Files** -> **File Manager**.
2. Open **`public_html`** (or the document root Hostinger shows for your domain).
3. **Delete** old test files if needed (`default.php`, etc.) so SPA routing works.
4. **Upload** everything **inside** `dist/`:
   - `index.html` must end up in `public_html/index.html`
   - `assets` folder in `public_html/assets/`

Do **not** upload the `client` or `src` folders -- only **`dist`** contents.

### 4.6 If you use FTP (FileZilla)

1. Host: `ftp.yourdomain.com` or IP from Hostinger.
2. User/password from **FTP Accounts** in hPanel.
3. Remote path: `/public_html`
4. Upload all files from local `client/dist/`.

### 4.7 SPA refresh (optional but recommended)

If Hostinger allows **`.htaccess`** in `public_html`, add:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

So refreshing `/dashboard` still loads the app. If `.htaccess` is disabled, use Hostinger **Redirects** or contact support; some panels have a “Force HTTPS” and “Single Page Application” toggle.

### 4.8 SSL on main domain

In hPanel: **SSL** -> enable **Free SSL** (Let’s Encrypt) for `yourdomain.com` and `www`.

---

## 5. Firebase Console (after both are live)

1. **Authentication** -> **Settings** -> **Authorized domains**  
   Add:
   - `yourdomain.com`
   - `www.yourdomain.com`
   - `api.yourdomain.com` (if you ever open auth flows there -- usually not required for API only)

2. Deploy indexes (from your PC, in repo):

   ```bash
   cd ctf-platform
   npx firebase-tools deploy --only firestore:indexes
   npx firebase-tools deploy --only firestore:rules
   ```

3. **Storage** rules if you use uploads (admin uploads) -- ensure your rules match your security model.

---

## 6. CORS

The Express app uses `cors()` without strict origin by default, so browser calls from `https://yourdomain.com` to `https://api.yourdomain.com` usually work. If you lock CORS later, add your frontend origin explicitly.

---

## 7. Update workflow (summary)

| What changed | Where | Commands / actions |
|--------------|--------|---------------------|
| API code | VPS | `cd /var/www/ctf-app && git pull && npm install && pm2 restart ctf-api` |
| Frontend | Your PC | Edit code -> `npm run build:client` -> upload **new** `client/dist/*` to Hostinger `public_html` |
| Env API URL | Your PC `.env` | Change `VITE_API_URL` -> **rebuild client** -> re-upload dist |

---

## 8. Checklist

- [ ] DNS: `api` -> VPS IP; main domain -> Hostinger hosting
- [ ] VPS: Node, PM2, Nginx, Certbot for `api.yourdomain.com`
- [ ] VPS: `server/config/serviceAccountKey.json` with `chmod 600`
- [ ] VPS: `curl https://api.yourdomain.com/api/health` OK
- [ ] PC: `.env` has `VITE_API_URL=https://api.yourdomain.com/api`
- [ ] PC: `npm run build:client`
- [ ] Hostinger: full contents of `client/dist/` in `public_html`
- [ ] Firebase authorized domains include your main domain
- [ ] Firestore indexes + rules deployed

---

## 9. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Browser Network tab: API calls go to wrong host | Rebuild client with correct `VITE_API_URL`; hard refresh (Ctrl+F5). |
| CORS error | Server `cors` settings; ensure API URL is exactly as built. |
| 502 on API | `pm2 status`, `pm2 logs ctf-api`, Nginx `error.log`. |
| Firebase Auth popup fails | Authorized domains + correct Firebase config in built JS. |
| 404 on refresh on main site | `.htaccess` rewrite or Hostinger SPA option. |
| Leaderboard 500 | Deploy Firestore composite indexes (`firestore.indexes.json`). |

---

## 10. One-line mental model

- **Hostinger shared hosting** = only **static files** from **`client/dist/`**.
- **Hostinger VPS** = **Node (PM2) + Nginx + HTTPS** for **`https://api.yourdomain.com`**.
- **Build** the client with **`VITE_API_URL=https://api.yourdomain.com/api`** so the browser talks to the VPS.
