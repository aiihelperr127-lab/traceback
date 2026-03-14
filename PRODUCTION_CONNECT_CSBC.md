# CSBC production — API on VPS IP only + HTTPS frontend

**Frontend:** [https://traceback-ctf-csbc.sanjivaniuniversity.com/](https://traceback-ctf-csbc.sanjivaniuniversity.com/)  
**Backend:** Stays on **VPS only** — Node on port **4000**, reachable as **`http://YOUR_VPS_IP:4000`** (no API domain, no Certbot on API).

---

## Why you can’t put `http://IP/api` in the React build

The site is **HTTPS**. Browsers **block** JavaScript from calling **`http://…`** (mixed content).  
So the app **cannot** use `VITE_API_URL=http://187.x.x.x/api` while users open the **HTTPS** frontend.

**Fix (API still on IP):** Browsers only talk to **`https://traceback-ctf-csbc.sanjivaniuniversity.com`**.  
On **Hostinger**, you **reverse-proxy** `/api` → **`http://YOUR_VPS_IP:4000/api`**.  
Then the build uses:

```env
VITE_API_URL=https://traceback-ctf-csbc.sanjivaniuniversity.com/api
```

So: **no API domain** — only the frontend URL in the app; Hostinger forwards `/api` to your VPS IP.

---

## 1) VPS (backend — IP only)

- Node + PM2 on **4000** (same as now).
- Nginx optional; can bind **`:4000`** directly if firewall allows (see below).

```bash
curl -s http://127.0.0.1:4000/api/health
```

**Firewall:** allow **4000/tcp** from the internet (or only from Hostinger outbound IPs if you know them — harder). Easiest: `ufw allow 4000/tcp` (or open in cloud panel).

**VPS `.env`:**

```env
PORT=4000
NODE_ENV=production
CORS_ORIGINS=https://traceback-ctf-csbc.sanjivaniuniversity.com,http://localhost:5173
```

Restart: `pm2 restart ctf-api`

---

## 2) Hostinger (frontend + proxy to IP)

Upload **`client/dist/`** (after build — see §3).

**Apache** must proxy `/api` to the VPS (replace `YOUR_VPS_IP`):

Create or edit **`.htaccess`** in the site root (same folder as `index.html`), **above** the SPA rewrite block:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
</IfModule>

# API on VPS IP — no API domain
<IfModule mod_proxy.c>
  ProxyPreserveHost Off
  ProxyPass        /api http://YOUR_VPS_IP:4000/api
  ProxyPassReverse /api http://YOUR_VPS_IP:4000/api
</IfModule>

# SPA (keep your existing rules below, or use repo client/public/.htaccess for non-/api routes)
<IfModule mod_rewrite.c>
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_URI} !^/api
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

- If Hostinger returns **500** or proxy errors, **`mod_proxy` may be off** on shared hosting — open a ticket: *enable mod_proxy (or reverse proxy) for `/api` to our VPS*, or use a Hostinger **VPS** for the same Apache config.
- After proxy works:  
  `curl -s https://traceback-ctf-csbc.sanjivaniuniversity.com/api/health` → should match VPS health JSON.

---

## 3) PC — build

**`ctf-platform/.env`:**

```env
VITE_API_URL=https://traceback-ctf-csbc.sanjivaniuniversity.com/api
```

```bash
cd ctf-platform/client
npm run build
```

Upload **all of `dist/`** — replaces the [default Hostinger page](https://traceback-ctf-csbc.sanjivaniuniversity.com/).

---

## 4) Firebase

- **Authorized domains:** `traceback-ctf-csbc.sanjivaniuniversity.com`
- VPS **`serviceAccountKey.json`** = same project as the web app.

---

## Checklist

| Step | Done |
|------|------|
| VPS `curl http://127.0.0.1:4000/api/health` | ☐ |
| Port **4000** open to Hostinger (or world) | ☐ |
| `CORS_ORIGINS` includes frontend HTTPS origin | ☐ |
| Hostinger `.htaccess` proxies `/api` → `http://VPS_IP:4000/api` | ☐ |
| `curl https://traceback-ctf-csbc.sanjivaniuniversity.com/api/health` | ☐ |
| Build with `VITE_API_URL=https://traceback-ctf-csbc.sanjivaniuniversity.com/api` | ☐ |

---

## Summary

| Piece | Value |
|-------|--------|
| Backend | **`http://VPS_IP:4000`** only (no API domain) |
| Browser API base | **`https://traceback-ctf-csbc.sanjivaniuniversity.com/api`** (proxy → IP) |
| CORS | Frontend origin allowed on VPS |

More deploy detail: [DEPLOYMENT_HOSTINGER_FRONTEND_AND_VPS_BACKEND.md](./DEPLOYMENT_HOSTINGER_FRONTEND_AND_VPS_BACKEND.md)
