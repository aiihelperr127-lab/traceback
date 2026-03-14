# GitHub → VPS (pull when you change code)

**Repo:** [github.com/aiihelperr127-lab/traceback](https://github.com/aiihelperr127-lab/traceback)  
**Clone URL:** `https://github.com/aiihelperr127-lab/traceback.git`

You **don’t** “connect GitHub to VPS” like a button in GitHub — you **clone/pull on the server** so the VPS always has the latest code from GitHub.

Layout on GitHub (root of repo): `client/`, `server/`, `shared/`, `package.json` — same as this monorepo root.

---

## 1. One-time setup on the VPS

### A. Install Git (if needed)

```bash
sudo apt update && sudo apt install -y git
```

### B. Clone the repo

**Public repo:**

```bash
cd /var/www
git clone https://github.com/aiihelperr127-lab/traceback.git traceback
cd traceback/server
npm install
cd ..
npm install
```

**Private repo** (or SSH) — use a **Deploy key** (read-only):

1. On VPS:
   ```bash
   ssh-keygen -t ed25519 -C "vps-deploy" -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub
   ```
2. GitHub → **[traceback](https://github.com/aiihelperr127-lab/traceback) → Settings → Deploy keys → Add deploy key**  
   Paste the **public** key, allow read access.
3. Clone with SSH:
   ```bash
   GIT_SSH_COMMAND='ssh -i ~/.ssh/github_deploy' git clone git@github.com:aiihelperr127-lab/traceback.git traceback
   ```
   Or `~/.ssh/config`:
   ```text
   Host github.com-deploy
     HostName github.com
     User git
     IdentityFile ~/.ssh/github_deploy
   ```
   Then:
   ```bash
   git clone git@github.com-deploy:aiihelperr127-lab/traceback.git traceback
   ```

### C. Server env + PM2 (once)

- Copy **`.env`** (repo root) and **`server/config/serviceAccountKey.json`** on the VPS (never commit secrets).
- Start API:
  ```bash
  cd /var/www/traceback/server
  pm2 start server.js --name ctf-api
  pm2 save
  ```

---

## 2. Every time you change code (your workflow)

On **your PC**: commit + push to **`main`** on [traceback](https://github.com/aiihelperr127-lab/traceback.git).

On the **VPS** (SSH in):

```bash
cd /var/www/traceback
git pull origin main
cd server
npm install
pm2 restart ctf-api
```

If you changed **shared** or root **`package.json`**:

```bash
cd /var/www/traceback
npm install
```

**Frontend** (Hostinger): build on your PC, upload **`client/dist/`**. If the API also serves static from this repo on the VPS:

```bash
cd /var/www/traceback/client
npm install
npm run build
pm2 restart ctf-api
```

---

## 3. Optional: one command on VPS

Save as **`deploy.sh`** in `/var/www/traceback/`:

```bash
#!/bin/bash
set -e
cd /var/www/traceback
git pull origin main
cd server
npm install --omit=dev
pm2 restart ctf-api
echo "Deployed from https://github.com/aiihelperr127-lab/traceback.git"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 4. Optional: auto-deploy on every push (GitHub Actions)

- Repo **Settings → Secrets**: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
- On `push` to **`main`**, SSH runs:
  `cd /var/www/traceback && git pull origin main && cd server && npm install --omit=dev && pm2 restart ctf-api`

---

## Summary

| What | Where |
|------|--------|
| **GitHub** | [aiihelperr127-lab/traceback](https://github.com/aiihelperr127-lab/traceback.git) |
| **Clone dir (example)** | `/var/www/traceback` |
| **API** | `/var/www/traceback/server` → `pm2 start server.js` |
| **Update VPS** | `git pull origin main` → `npm install` → `pm2 restart ctf-api` |

VPS is a clone of that repo; **`git pull`** whenever you want the latest changes.
