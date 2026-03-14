# GitHub → VPS (pull when you change code)

You **don’t** “connect GitHub to VPS” like a button in GitHub — you **clone/pull on the server** so the VPS always has the latest code from GitHub.

---

## 1. One-time setup on the VPS

### A. Install Git (if needed)

```bash
sudo apt update && sudo apt install -y git
```

### B. Clone your repo

**Public repo:**

```bash
cd /var/www
git clone https://github.com/YOUR_USER/YOUR_REPO.git ctf-app
cd ctf-app/ctf-platform/server
npm install
cd ..
npm install
```

**Private repo** — use a **Deploy key** (read-only, safer than your password):

1. On VPS:
   ```bash
   ssh-keygen -t ed25519 -C "vps-deploy" -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub
   ```
2. GitHub → **Repo → Settings → Deploy keys → Add deploy key**  
   Paste the **public** key, allow read access.
3. Clone with SSH:
   ```bash
   GIT_SSH_COMMAND='ssh -i ~/.ssh/github_deploy' git clone git@github.com:YOUR_USER/YOUR_REPO.git ctf-app
   ```
   Or add to `~/.ssh/config`:
   ```text
   Host github.com-deploy
     HostName github.com
     User git
     IdentityFile ~/.ssh/github_deploy
   ```
   Then: `git clone git@github.com-deploy:YOUR_USER/YOUR_REPO.git ctf-app`

### C. Server env + PM2 (once)

- Copy `.env` and `server/config/serviceAccountKey.json` on the VPS (never commit these).
- Start API:
  ```bash
  cd /var/www/ctf-app/ctf-platform/server
  pm2 start server.js --name ctf-api
  pm2 save
  ```

---

## 2. Every time you change code (your workflow)

On **your PC**: commit + push to GitHub as usual.

On the **VPS** (SSH in):

```bash
cd /var/www/ctf-app   # or wherever you cloned
git pull
cd ctf-platform/server
npm install
pm2 restart ctf-api
```

If you changed **shared** or root `package.json`, also from `ctf-platform/`:

```bash
cd /var/www/ctf-app/ctf-platform
npm install
```

**Frontend** is usually built on your PC and you upload `client/dist/` to Hostinger — the VPS often runs **API only**. If you also serve static from the VPS:

```bash
cd /var/www/ctf-app/ctf-platform/client
npm install
npm run build
pm2 restart ctf-api
```

---

## 3. Optional: one command on VPS

Save as **`deploy.sh`** next to `ctf-platform` on the VPS (adjust paths):

```bash
#!/bin/bash
set -e
cd /var/www/ctf-app
git pull
cd ctf-platform/server
npm install --omit=dev
pm2 restart ctf-api
echo "Deployed."
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 4. Optional: auto-deploy on every push (GitHub Actions)

- Repo **Settings → Secrets**: add `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (private key that can SSH to VPS).
- Workflow: on `push` to `main`, SSH runs `cd /var/www/ctf-app && git pull && … pm2 restart ctf-api`.

Only do this if you’re comfortable with SSH keys in GitHub Secrets and a user on the VPS that can `git pull`.

---

## Summary

| What | Where |
|------|--------|
| Source of truth | **GitHub** (you push) |
| Update VPS | SSH → **`git pull`** → **`npm install`** (if needed) → **`pm2 restart ctf-api`** |
| Private repo | **Deploy key** on GitHub + SSH clone on VPS |

You **can** connect the two this way: VPS is just another clone that you **pull** whenever you want the latest changes.
