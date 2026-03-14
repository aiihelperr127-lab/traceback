# TracebackCTF — Security Model

No system is “unbreakable.” This document describes how the platform is hardened so **all game logic and data flow through your backend**, not through client-side or direct database access.

## Threat model (what we optimize for)

- **Players** must not read/write Firestore directly, forge scores, submit flags after the event ends, or brute-force flags at scale.
- **Admins** are trusted; protect admin accounts (strong passwords, 2FA on Google account, minimal admin count).
- **Automated abuse** (scraping, flag spraying) should be rate-limited.

## Controls implemented

| Area | Measure |
|------|--------|
| **Firestore** | Rules deny **all** client reads/writes. Only the **Firebase Admin SDK** on the server touches data. |
| **Registration** | Profile document ID is **always** the authenticated user’s Firebase `uid`. Client cannot register another user’s row. |
| **Every API action** | Valid **Firebase ID token** required (except `/api/health`). Token verified on every request. |
| **Banned users** | Checked on **every** authenticated request; suspended accounts get HTTP 403. |
| **Admin** | All `/api/admin/*` routes require `role === admin` on the **server** (not only UI). |
| **Flag submit** | Allowed only while the **competition timer is running**; team must exist; one solve per team per challenge; **constant-time** flag compare (mitigates trivial timing leaks); wrong flags stored as `[redacted]` (no guess leakage in DB). |
| **Rate limits** | Global API cap; stricter cap on **submit-flag** per user; auth and admin routes capped per IP/user. |
| **Body size** | JSON limited to **256 KB** to reduce abuse. |
| **CORS (production)** | Set `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com` so random sites cannot call your API from browsers (optional in dev). |
| **Proxy** | `trust proxy` enabled in production so rate limits see the real client IP behind Nginx. |
| **Uploads** | Admin-only; dangerous extensions blocked (e.g. `.exe`, `.ps1`, `.sh`). |
| **IDs** | Challenge IDs validated as safe strings before use in Firestore paths. |

## What you must do in production

1. **HTTPS only** (Nginx + Let’s Encrypt).
2. **Secrets**: `serviceAccountKey.json` and `.env` never in git; minimal file permissions on the VPS.
3. **CORS_ORIGINS** set to your real frontend origin(s).
4. **Firebase**: Enable **App Check** if you want extra bot resistance (optional).
5. **Monitoring**: Watch PM2/logs for 401/403 spikes and rate-limit hits.
6. **Dependencies**: Run `npm audit` regularly and patch.

## Out of scope (honest limits)

- **Compromised admin account** can change anything — protect admin logins.
- **Compromised server** or leaked service account = full access — protect the host.
- **DDoS** needs network-level protection (Hostinger/cloud), not only app rate limits.
- **Client-side UI** can always be modified in the browser; **authorization is enforced only on the server**.
