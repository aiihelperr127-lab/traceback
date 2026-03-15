# CSBC Production — Professional Setup (No PHP Proxy)

**Problem:** Hostinger/LiteSpeed strips `Authorization` before PHP. The PHP proxy cannot reliably forward the Bearer token → 401 "Invalid or expired token" despite the browser sending it correctly.

**Solution:** Use an API subdomain with HTTPS. The browser calls the API directly — no proxy, no header stripping.

---

## Architecture

| Component | URL |
|-----------|-----|
| Frontend | `https://traceback-ctf-csbc.sanjivaniuniversity.com` (Hostinger) |
| API | `https://traceback-ctf-api.sanjivaniuniversity.com/api` (VPS + Nginx + Let's Encrypt) |

---

## Step 1: DNS

Add an **A record** in the DNS for `sanjivaniuniversity.com`:

| Type | Name | Value |
|------|------|-------|
| A | `traceback-ctf-api` | **VPS public IP** (e.g. `187.127.130.81`) |

Result: `traceback-ctf-api.sanjivaniuniversity.com` resolves to your VPS.

---

## Step 2: VPS — Nginx + HTTPS

```bash
# On the VPS
cd /var/www/traceback
sudo cp server/nginx-api-https.conf /etc/nginx/sites-available/ctf-api
sudo ln -sf /etc/nginx/sites-available/ctf-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d traceback-ctf-api.sanjivaniuniversity.com
sudo systemctl reload nginx
```

Certbot will add HTTPS and HTTP→HTTPS redirect. Test:

```bash
curl -s https://traceback-ctf-api.sanjivaniuniversity.com/api/health
```

You should see `{"status":"ok",...}`.

---

## Step 3: VPS — CORS

In `/var/www/traceback/.env`:

```env
CORS_ORIGINS=https://traceback-ctf-csbc.sanjivaniuniversity.com,http://localhost:5173
```

```bash
pm2 restart ctf-api
```

---

## Step 4: Build + Deploy Frontend

In **`ctf-platform/.env`**:

```env
VITE_API_URL=https://traceback-ctf-api.sanjivaniuniversity.com/api
```

Then:

```bash
cd ctf-platform/client
npm run build
```

Upload **`dist/`** to Hostinger (for `traceback-ctf-csbc`). You **do not need** `api-proxy.php` or `.htaccess` API rewrite — remove them or leave them; the app will call the API subdomain directly.

---

## Step 5: Firebase

- **Authorized domains:** `traceback-ctf-csbc.sanjivaniuniversity.com` (already done)
- **VPS `serviceAccountKey.json`:** same project as `VITE_FIREBASE_PROJECT_ID`

---

## Checklist

| Step | Done |
|------|------|
| DNS A record `traceback-ctf-api` → VPS IP | ☐ |
| Nginx + certbot on VPS | ☐ |
| `curl https://traceback-ctf-api.../api/health` returns JSON | ☐ |
| `CORS_ORIGINS` includes frontend | ☐ |
| `VITE_API_URL=https://traceback-ctf-api.../api` | ☐ |
| Rebuild + upload `dist/` | ☐ |

---

## Summary

- **Before:** Browser → Hostinger (PHP proxy) → VPS. Headers stripped → 401.
- **After:** Browser → VPS API directly over HTTPS. Headers intact → auth works.
