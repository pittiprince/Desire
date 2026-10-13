# Desire – E-commerce backend

Node.js / Express / MongoDB backend for a minimalist (IKEA-inspired) shop: password and OTP (SMS + email) login, role-based access, and product management.

## Stack
Express 4, Mongoose 8, JWT, bcrypt, Zod, helmet, cors, express-rate-limit, Fast2SMS, Nodemailer. Tests: node:test + supertest (in-memory fake models, no MongoDB needed).

## Setup
```bash
npm install
cp .env.example .env   # fill in values
npm run dev            # or: npm start
npm test
```

| Variable | Required | Purpose |
|---|---|---|
| `MongooseURL` | yes | MongoDB connection string (Atlas) |
| `JWT_SECRET_KEY` | yes | JWT signing secret (also HMAC key for OTPs unless `OTP_SECRET` set) |
| `PORT` | no | Set by the host; default 3000 |
| `smsApi` | no | Fast2SMS key (SMS OTP) |
| `EMAIL`, `EMAIL_PASSWORD` | no | Gmail + app password (email OTP) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | no | Email OTP through any SMTP provider (e.g. Brevo free plan); takes priority over Gmail |
| `ADMIN_SIGNUP_SECRET` | no | Lets signup create an admin when `adminSecret` matches; empty disables admin signup |
| `CORS_ORIGIN` | no | Comma-separated allowed origins |
| `JWT_EXPIRES_IN` | no | Default `1d` |
| `AUTH_RATE_LIMIT`, `OTP_RATE_LIMIT`, `OTP_RESEND_COOLDOWN_MS` | no | Rate-limit tuning |

## API
Authentication: `Authorization: Bearer <token>` (legacy `token` header also accepted).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | – | Health check |
| POST | `/user/signup` | – | Always creates role `user`; admin only with valid `adminSecret` |
| POST | `/user/login` | – | Email + password → JWT |
| POST | `/user/sendOtpSMS`, `/user/sendOtpEmail` | – | Generic response, 60s resend cooldown |
| POST | `/user/verifyOtp` | – | 5 attempts max, single-use, returns JWT |
| GET | `/Products`, `/Products/:id` | – | Public; `page`, `limit` (≤50), `q`, `category` |
| POST | `/Products/admin/add` | admin | Validated, 201 |
| PATCH | `/Products/admin/:id` | admin | Whitelisted fields only |
| DELETE | `/Products/admin/:id` | admin | |
| POST | `/Products/admin/update`, `/Products/admin/Delete` | admin | Legacy routes kept for compatibility |

Responses are JSON.

## Deploy (Render + Atlas)
1. Create a free MongoDB Atlas M0 cluster, allow `0.0.0.0/0`, copy the URI.
2. Render → New Web Service from this repo: build `npm install`, start `npm start`, health check `/health`.
3. Add the env vars above. Free tier sleeps after 15 min idle, so the first request is slow.

## Demo
Set `SEED_DEMO=true` to load 12 products and demo accounts (demo-user@desire.dev, demo-admin@desire.dev, password Demo@12345). `/` serves a small live console that calls the API.
