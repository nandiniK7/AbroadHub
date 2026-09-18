# AbroadHub — Launch Build

A responsive React + Node full-stack AbroadHub build. The supplied AbroadHub reference and Figma screens are used as UX/layout references only; the implementation is an original, functional UI using the AbroadHub coral + white brand system.

## Stack
- React + Vite
- Node.js HTTP API (no extra backend runtime dependencies)
- JSON persistence for the launch/demo environment
- HMAC-signed JWT authentication
- scrypt password hashing
- Responsive mobile/desktop UI

## Run locally
```bash
npm install
npm run dev
```
- Frontend: http://localhost:5173
- API: http://localhost:8787/api/health

## Production
```bash
npm install
npm run build
npm start
```
The Node server serves `dist` and `/api/*` from one process. Set `PORT` and `JWT_SECRET` in deployment.

## Authentication test flow
1. Sign up with an email and password of at least 8 characters.
2. Registration intentionally does NOT auto-login; it returns to Login.
3. Log in with the created credentials.
4. Use Forgot password. In this launch/demo build the API returns a reset token so the flow can be tested without an email provider.
5. Paste the token, choose a new password, then log in again.

## Core API routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET/PUT /api/me`
- `GET/POST /api/posts`
- `POST /api/posts/:id/like`
- `GET/POST /api/jobs`
- `GET/POST /api/events`
- `GET /api/health`

## Important
This build intentionally uses a lightweight JSON datastore so it can launch immediately with zero database setup. For a multi-instance production deployment, replace `server/data/db.json` with MySQL/PostgreSQL and object storage for media.
