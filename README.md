# 💌 Date Request Platform

A world-class, production-ready viral romantic web experience where users craft personalized date proposals, share them, collect responses, and manage everything through a beautiful secure dashboard.

---

## ✨ Features

### 🌸 Receiver Experience (8-Step Journey)
- Animated intro with typewriter effect
- Step 1 — YES/NO proposal (NO button dodges cursor!)
- Step 2 — Multi-select food cards with animations
- Step 3 — Activity single-select cards
- Step 4 — Place selection with illustrated cards
- Step 5 — Interactive calendar with swipe support
- Step 6 — Time chip selector + custom time input
- Step 7 — Animated love meter slider (0–100%) with emoji milestones
- Step 8 — Personal message with emoji picker
- Confirmation page with confetti + fireworks + floating hearts
- Screenshot (html2canvas) + Web Share API
- Secret letter with envelope open animation

### 👤 Sender Dashboard
- Create unlimited Date Requests with unique share links
- Real-time WebSocket notifications
- Response viewer with full details
- Per-request analytics (food/place/activity charts)
- CSV / HTML export
- Dark / Light mode

### 👑 Super Admin Panel
- Full user management (suspend/delete)
- All requests and responses management
- Platform-wide analytics charts
- Telegram + Email + Discord notifications on every response
- Audit logs
- Data export (CSV/JSON)
- Platform settings

### 🔐 Security
- JWT Access Token (15 min) + Refresh Token (30 days, httpOnly cookie)
- bcrypt password hashing (12 rounds)
- Rate limiting (auth: 10/min, API: 100/min)
- Helmet.js security headers
- CORS whitelist
- Audit logging on all sensitive actions

---

## 🚀 Quick Start

```bash
# 1. Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your values

# 2. Initialize database
npx prisma migrate dev --name init
npm run db:seed

# 3. Start development server
npm run dev

# Open: http://localhost:3000
```

### Default Credentials (after seed)
| Role  | Email                      | Password      |
|-------|----------------------------|---------------|
| Admin | admin@daterequest.com      | Admin@123456  |
| Demo  | demo@daterequest.com       | Demo@123456   |

---

## 📁 Project Structure

```
date-request-app/
├── frontend/
│   ├── index.html              ← Receiver experience (all 8 steps)
│   ├── auth/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── forgot-password.html
│   │   └── reset-password.html
│   ├── dashboard/
│   │   └── index.html          ← Sender dashboard
│   ├── admin/
│   │   └── index.html          ← Super admin panel
│   └── assets/
│       ├── css/
│       │   ├── tokens.css      ← Design tokens (CSS variables)
│       │   ├── global.css      ← Base styles + components
│       │   ├── animations.css  ← All keyframes + animation utils
│       │   └── steps.css       ← Step-specific styles
│       └── js/
│           ├── app.js          ← Core utils (theme, toast, api, confetti)
│           ├── steps.js        ← Multi-step journey logic
│           ├── animations.js   ← Fireworks, particles, effects
│           ├── auth.js         ← Auth forms + validation
│           ├── dashboard.js    ← Sender dashboard logic
│           └── admin.js        ← Admin panel logic
│
├── backend/
│   ├── src/
│   │   ├── server.js           ← Express + Socket.io entry point
│   │   ├── config/db.js        ← Prisma client
│   │   ├── routes/             ← All route definitions
│   │   ├── controllers/        ← Business logic
│   │   ├── middleware/         ← Auth, admin, rate limit
│   │   ├── services/           ← Notifications (Telegram/Email/Discord)
│   │   └── utils/              ← Token, device, logger, seed
│   ├── prisma/schema.prisma    ← Full DB schema
│   └── .env.example
│
└── docs/
    ├── API.md                  ← Full REST API docs
    └── DEPLOYMENT.md           ← Railway/Render/Docker guide
```

---

## 🗄️ Database Schema

| Table          | Purpose                              |
|----------------|--------------------------------------|
| `User`         | Senders + admins                     |
| `DateRequest`  | Each date proposal with share token  |
| `Response`     | Receiver submissions                 |
| `Analytics`    | View/submit/share events             |
| `Notification` | In-app bells for senders             |
| `AuditLog`     | Security audit trail                 |
| `Session`      | Refresh token storage                |
| `Setting`      | Platform + notification config       |

---

## 🌐 API Overview

| Method | Route                          | Description              |
|--------|--------------------------------|--------------------------|
| POST   | /api/v1/auth/register          | Create account           |
| POST   | /api/v1/auth/login             | Login                    |
| GET    | /api/v1/requests               | List own requests        |
| POST   | /api/v1/requests               | Create date request      |
| GET    | /api/v1/public/date/:token     | Load receiver page       |
| POST   | /api/v1/public/date/:token/respond | Submit response      |
| GET    | /api/v1/dashboard/stats        | Sender stats             |
| GET    | /api/v1/admin/stats            | Platform-wide stats      |

Full docs → [docs/API.md](docs/API.md)

---

## 🔔 Notifications Setup

### Telegram (Admin)
1. Create bot via [@BotFather](https://t.me/BotFather)
2. Get Chat ID from `getUpdates` API
3. Add to `.env`: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`

### Email (SMTP)
1. Gmail → Security → App Passwords → Generate
2. Add to `.env`: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

### Discord
1. Channel Settings → Integrations → Webhooks → Copy URL
2. Add to `.env`: `DISCORD_WEBHOOK_URL`

---

## 🎨 Design System

| Token              | Value                  |
|--------------------|------------------------|
| `--color-primary`  | `#FF6B9D` Rose Pink    |
| `--color-secondary`| `#C23B77` Deep Rose    |
| `--font-display`   | Playfair Display       |
| `--font-body`      | Nunito                 |
| `--font-cursive`   | Dancing Script         |

---

## 🚀 Deploy

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- Railway (recommended)
- Render
- Docker / docker-compose
- Custom domain + SSL
- CI/CD with GitHub Actions

---

## 📄 License

MIT License — Built with 💕 by Shuvo Ahmed (@shuvo_9882)
