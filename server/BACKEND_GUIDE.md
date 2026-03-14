# Backend guide — what you can change

The API lives in **`ctf-platform/server/`**. It reads **`ctf-platform/.env`** (path `../.env` from `server.js`).

---

## 1. Folder map

| Path | Purpose |
|------|--------|
| **`server.js`** | App entry: CORS, helmet, rate limits, mounts all `/api/...` routes, static `client/dist`, SPA fallback. |
| **`config/firebase.js`** | Firebase Admin + Firestore + Storage. Needs **`config/serviceAccountKey.json`**. |
| **`middleware/authMiddleware.js`** | `authenticate` (Bearer Firebase ID token), `requireAdmin`. |
| **`middleware/securityMiddleware.js`** | CORS (`CORS_ORIGINS`), rate limits, `trustProxy` (behind nginx). |
| **`middleware/errorHandler.js`** | Global errors → JSON. |
| **`middleware/validateIds.js`** | Optional ID validation. |
| **`routes/*.js`** | Small routers: URL prefix + HTTP method → controller. |
| **`controllers/*.js`** | Request/response: call services, return JSON. |
| **`services/*.js`** | Firestore / business logic (good place for real behavior changes). |

Shared constants (collections, roles) come from the **`shared`** package at repo root.

---

## 2. Safe / common changes

### Environment (`ctf-platform/.env`)

| Variable | Effect |
|----------|--------|
| `PORT` | Listen port (default `4000`). |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API. Empty = permissive (dev only). |
| `FIREBASE_STORAGE_BUCKET` | GCS bucket for admin uploads (usually `projectId.appspot.com`). |
| `NODE_ENV=production` | On the **VPS only** (PM2/systemd): combined logs, stricter 500 responses. Don’t rely on it in the same file as Vite client builds if Vite complains. |

Restart after edits: `pm2 restart ctf-api` (or stop/start `node server.js`).

### CORS

Edit **`middleware/securityMiddleware.js`** → `corsOptions()`.  
Production: set `CORS_ORIGINS=https://your-site.com,https://www.your-site.com`.

### Rate limits

Same file: `globalLimiter`, `submitFlagLimiter`, `authLimiter`, `adminLimiter` — adjust `windowMs` / `max` if players hit limits too often.

### Auth behavior

**`middleware/authMiddleware.js`**

- After `verifyIdToken`, you can add checks (e.g. block list, custom claims).
- `requireAdmin` uses Firestore user doc `role === 'admin'`.

### New API endpoint (pattern)

1. **Service** (optional): `services/myFeatureService.js` — talk to Firestore.
2. **Controller**: `controllers/myController.js` — `async function getX(req, res, next) { ... }`.
3. **Route**: `routes/myRoutes.js`:

   ```js
   const express = require('express');
   const router = express.Router();
   const { authenticate } = require('../middleware/authMiddleware');
   const myController = require('../controllers/myController');

   router.get('/something', authenticate, myController.getSomething);
   module.exports = router;
   ```

4. **`server.js`**:

   ```js
   const myRoutes = require('./routes/myRoutes');
   app.use('/api/my-feature', myRoutes);
   ```

Public route (no login): omit `authenticate`. Admin-only: `authenticate`, `requireAdmin` (see `routes/admin.js`).

### Health check

**`server.js`** — `GET /api/health` — change response or add DB ping if you want.

### Static SPA + API on same server

**`server.js`** serves `../client/dist` and `GET *` → `index.html` for non-API paths.  
Split deploy (Hostinger + VPS): you can ignore static section on VPS or keep it for single-box deploys.

---

## 3. Firebase / data layer

| File | Change |
|------|--------|
| **`config/firebase.js`** | Bucket name, init only — rarely need to edit. |
| **`config/serviceAccountKey.json`** | Replace when rotating keys; **project_id must match** the web app Firebase project. |
| **`services/*Service.js`** | Queries, writes, scoring, teams, challenges — **main place for game rules**. |

Firestore collection names live in **`shared`** — keep server and client aligned if you add collections.

---

## 4. Existing routes (quick reference)

| Prefix | File | Notes |
|--------|------|--------|
| `/api/auth` | `routes/auth.js` | Register, profile (authenticated). |
| `/api/challenges` | `routes/challenges.js` | List/detail/hint. |
| `/api/submit-flag` | `server.js` + `submissionController` | Flag submit. |
| `/api/leaderboard` | `routes/leaderboard.js` | Board + timeline. |
| `/api/teams` | `routes/teams.js` | Teams. |
| `/api/admin` | `routes/admin.js` | Admin UI API. |
| `/api/upload` | `routes/upload.js` | Admin file upload. |
| `/api/announcements` | inline in `server.js` | |
| `/api/timer` | inline in `server.js` | |

---

## 5. After you change code

- **Local:** from `server/`: `npm run dev` (nodemon) or `node server.js`.
- **VPS:** `git pull` → `pm2 restart ctf-api` (or your process name).

No build step for the server (Node runs `.js` directly).

---

## 6. What not to break

- **`authenticate`** on routes that expect a logged-in user — client sends `Authorization: Bearer <Firebase ID token>`.
- **Admin routes** — always `authenticate` + `requireAdmin`.
- **Same Firebase project** on client and server service account — otherwise tokens fail with “Invalid or expired token”.

If you tell us what you want (e.g. “new public endpoint”, “change scoring”, “stricter admin”), we can point to the exact file and function.
