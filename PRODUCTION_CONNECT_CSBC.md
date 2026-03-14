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

## 2) Hostinger (frontend + API via PHP proxy)

Shared Hostinger often **does not** enable Apache `ProxyPass` → `/api` returns **404** and the app shows **Invalid response (404)**.

**Fix:** use the **PHP proxy** included in the repo (no `mod_proxy` needed).

1. **VPS firewall:** allow **TCP 4000** from the internet (Hostinger’s server must reach your VPS).
2. **Build** (§3) — `client/public/` copies into **`dist/`**:
   - **`api-proxy.php`** — open it and set **`YOUR_VPS_IP`** to your VPS public IP.
   - **`.htaccess`** — rewrites `/api/*` → `api-proxy.php`.
3. Upload **everything in `dist/`** to the site root, including **`api-proxy.php`** and **`.htaccess`**.
4. Test:
   ```bash
   curl -s https://traceback-ctf-csbc.sanjivaniuniversity.com/api/health
   ```
   → should print `{"status":"ok",...}`.

Optional: if Hostinger **does** allow `mod_proxy`, you can use `ProxyPass` instead (see older revision); PHP proxy is the reliable default.

### Proxy still fails (502 / “cannot reach backend”)

1. **Placeholder** — In `api-proxy.php`, `$BACKEND` must be your real IP, not `YOUR_VPS_PUBLIC_IP`.
2. **From your PC** (replace IP):
   ```bash
   curl -s --connect-timeout 5 http://VPS_IP:4000/api/health
   ```
   If this **fails**, open port **4000** on the VPS: `sudo ufw allow 4000/tcp && sudo ufw reload`.
3. **Hostinger blocks outbound port 4000** (common) — PHP’s curl to `:4000` never connects. **Workaround:** on the **VPS**, put **Nginx on port 80** (only API, or default_server) proxying to `127.0.0.1:4000`, then set:
   ```php
   $BACKEND = 'http://VPS_IP';   // port 80, path still /api/...
   ```
   Re-upload `api-proxy.php`. Test: `curl http://VPS_IP/api/health` from your PC.

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
