# SILA Session DB API

Session database API for SILA MD bots — inahifadhi WhatsApp sessions kwenye MongoDB ili bot isilazimike kulink tena baada ya restart.

## Setup

1. **MongoDB Atlas** — tengeneza cluster bure kwenye https://mongodb.com/atlas
2. **Clone repo** hii
3. **Copy .env** — `cp .env.example .env` na ujaze `MONGODB_URI` na `API_KEY`
4. **Install** — `npm install`
5. **Run** — `npm start`
6. **Deploy** — Render / Railway / Fly.io (bure)

## Deploy kwenye Render

1. Push repo kwenye GitHub
2. Render → New Web Service → connect repo
3. Build: `npm install`, Start: `npm start`
4. Ongeza env vars: `MONGODB_URI`, `API_KEY`
5. Utapata link kama `https://sila-session-db.onrender.com`

## API Endpoints

| Method | Endpoint | Auth | Maelezo |
|--------|----------|------|---------|
| GET | `/` | ❌ | Health check |
| POST | `/api/session` | ✅ | Save/update session |
| GET | `/api/session/:number` | ✅ | Pata session moja |
| GET | `/api/sessions` | ✅ | Pata sessions zote |
| DELETE | `/api/session/:number` | ✅ | Futa session |
| POST | `/api/session/:number/touch` | ✅ | Update lastConnected |

Auth: header `x-api-key: YOUR_API_KEY`

## Owner
Sila Tech — 255789661031
