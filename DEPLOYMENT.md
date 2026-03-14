# TracebackCTF -- Deployment Guide

## Architecture

```
Client (React)  -->  Build to static files  -->  Served by Express
Server (Express) -->  Node.js on port 4000  -->  Behind Nginx reverse proxy
Database         -->  Firebase Firestore (cloud)
Auth             -->  Firebase Auth (cloud)
```

Single VPS runs everything. Nginx handles HTTPS and proxies traffic to Express, which serves both the API and the built React frontend.

---

## Prerequisites

- Hostinger VPS (Ubuntu 22.04+ recommended)
- A domain pointed to your VPS IP (A record in DNS)
- Firebase project with Firestore, Auth, and Storage enabled
- Service account key file from Firebase Console

---

## 1. Server Setup

SSH into your VPS:

```bash
ssh root@your-vps-ip
```

Install Node.js, Nginx, and PM2:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2
```

Verify:

```bash
node -v    # v18.x+
npm -v     # 9.x+
nginx -v
pm2 -v
```

---

## 2. Upload the Project

```bash
cd /var/www
git clone <your-repo-url> ctf-platform
cd ctf-platform/ctf-platform
```

---

## 3. Configure Environment

Create the `.env` file in the monorepo root (`/var/www/ctf-platform/ctf-platform/.env`):

```
PORT=4000

VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

VITE_API_URL=/api
```

Place your Firebase service account key at:

```
/var/www/ctf-platform/ctf-platform/server/config/serviceAccountKey.json
```

Set permissions:

```bash
chmod 600 /var/www/ctf-platform/ctf-platform/server/config/serviceAccountKey.json
```

---

## 4. Install and Build

```bash
cd /var/www/ctf-platform/ctf-platform
npm install
npm run build:client
```

This generates `client/dist/` with the production frontend. Express serves these files automatically.

---

## 5. Start the Server with PM2

```bash
cd /var/www/ctf-platform/ctf-platform/server
pm2 start server.js --name ctf-platform
pm2 save
pm2 startup
```

Verify it's running:

```bash
pm2 status
curl http://localhost:4000/api/health
```

Useful PM2 commands:

```bash
pm2 logs ctf-platform     # view logs
pm2 restart ctf-platform   # restart
pm2 stop ctf-platform      # stop
pm2 monit                  # live monitoring
```

---

## 6. Configure Nginx

Create the site config:

```bash
sudo nano /etc/nginx/sites-available/ctf
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/ctf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Your site is now live at `http://yourdomain.com`.

---

## 7. Enable HTTPS

Install Certbot and get a free SSL certificate:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

Follow the prompts. Certbot auto-configures Nginx for HTTPS and sets up auto-renewal.

Verify renewal works:

```bash
sudo certbot renew --dry-run
```

---

## 8. Firebase Console Setup

After deploying, update these settings in the Firebase Console:

1. **Authentication > Settings > Authorized domains** -- add `yourdomain.com`
2. **Firestore > Indexes** -- ensure composite indexes are deployed:
   ```bash
   npx firebase-tools deploy --only firestore:indexes
   ```
3. **Firestore > Rules** -- deploy security rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

---

## 9. Updating After Code Changes

```bash
cd /var/www/ctf-platform/ctf-platform
git pull origin main
npm install
npm run build:client
pm2 restart ctf-platform
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| 502 Bad Gateway | Check if Node is running: `pm2 status` |
| Firebase Auth errors in browser | Add domain to Firebase Authorized domains |
| Firestore query errors | Deploy indexes: `npx firebase-tools deploy --only firestore:indexes` |
| Permission denied on key file | `chmod 600 server/config/serviceAccountKey.json` |
| Port 4000 already in use | `pm2 kill` then restart, or change PORT in `.env` |
| Nginx config test fails | `sudo nginx -t` to see the exact error |

---

## Security Checklist

- [ ] `serviceAccountKey.json` is in `.gitignore` and has `chmod 600`
- [ ] `.env` is in `.gitignore` and not committed
- [ ] HTTPS is enabled via Certbot
- [ ] Firebase Authorized domains updated
- [ ] Firestore rules deployed (denies direct client writes)
- [ ] UFW firewall enabled: `sudo ufw allow 22,80,443/tcp && sudo ufw enable`
