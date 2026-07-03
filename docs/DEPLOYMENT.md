# 🚀 Deployment Guide — Date Request Platform

## Quick Start (Local Development)

```bash
# 1. Clone & install
cd date-request-app/backend
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your values

# 3. Setup database
npx prisma migrate dev --name init
npm run db:seed

# 4. Start server
npm run dev
# Visit: http://localhost:3000
```

---

## 🚂 Deploy on Railway (Recommended)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit 💌"
git remote add origin https://github.com/yourusername/date-request-app.git
git push -u origin main
```

### Step 2 — Create Railway Project
1. Go to [railway.app](https://railway.app) → New Project
2. Click **Deploy from GitHub repo** → select your repo
3. Railway auto-detects Node.js

### Step 3 — Add PostgreSQL
1. In Railway dashboard → **New** → **Database** → **PostgreSQL**
2. Copy the `DATABASE_URL` from the PostgreSQL service

### Step 4 — Set Environment Variables
In Railway service → **Variables** tab, add:

```
NODE_ENV=production
DATABASE_URL=postgresql://...  (from Railway PostgreSQL)
JWT_SECRET=your_super_secret_32_char_minimum_key
BCRYPT_ROUNDS=12
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=Admin@SecurePass123
ADMIN_USERNAME=superadmin
FRONTEND_URL=https://your-app.railway.app
ALLOWED_ORIGINS=https://your-app.railway.app
COOKIE_SECRET=another_random_secret_key

# Optional — Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Optional — Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="DateRequest 💌 <your@gmail.com>"

# Optional — Discord
DISCORD_WEBHOOK_URL=
```

### Step 5 — Set Start Command
In Railway → **Settings** → **Deploy**:
- **Build Command:** `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && node src/utils/seed.js`
- **Start Command:** `cd backend && node src/server.js`
- **Root Directory:** `/` (project root)

### Step 6 — Configure Domain
Railway → **Settings** → **Networking** → Generate Domain

✅ Done! Your app is live at `https://your-app.railway.app`

---

## 🎨 Deploy on Render

### Step 1 — Create Web Service
1. [render.com](https://render.com) → New → **Web Service**
2. Connect GitHub repo
3. Set:
   - **Build Command:** `cd backend && npm install && npx prisma generate`
   - **Start Command:** `cd backend && npx prisma migrate deploy && node src/utils/seed.js && node src/server.js`
   - **Environment:** `Node`

### Step 2 — Add PostgreSQL
1. New → **PostgreSQL** → Create
2. Copy Internal Database URL

### Step 3 — Environment Variables
Same as Railway above. Add in Render dashboard → **Environment**.

---

## ▲ Deploy on Vercel (Frontend Only)

For Vercel, deploy frontend separately and backend on Railway/Render.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod
```

Update `FRONTEND_URL` and `ALLOWED_ORIGINS` in backend `.env` to match Vercel URL.

---

## 🐳 Docker (Optional)

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/daterequest
    depends_on:
      - db
    command: >
      sh -c "npx prisma migrate deploy &&
             node src/utils/seed.js &&
             node src/server.js"

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: daterequest
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker-compose up -d
```

---

## 🔧 Backend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "src/server.js"]
```

---

## 📧 Gmail SMTP Setup

1. Google Account → Security → **2-Step Verification** → ON
2. Security → **App passwords** → Generate
3. Use generated 16-char password as `SMTP_PASS`

---

## 🤖 Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy **Bot Token** → `TELEGRAM_BOT_TOKEN`
3. Get Chat ID:
   - Add bot to your group/channel
   - Send a message
   - Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find `"chat":{"id": -100XXXXXXX}` → `TELEGRAM_CHAT_ID`

---

## 🎮 Discord Webhook Setup

1. Discord Server → Channel Settings → **Integrations**
2. **Webhooks** → New Webhook → Copy URL
3. Paste as `DISCORD_WEBHOOK_URL`

---

## 🔒 Production Security Checklist

- [ ] Strong `JWT_SECRET` (32+ random chars)
- [ ] Strong `COOKIE_SECRET` (32+ random chars)
- [ ] Change default admin password immediately after seed
- [ ] Enable HTTPS (Railway/Render do this automatically)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` to your domain only
- [ ] Use PostgreSQL (not SQLite) in production
- [ ] Set up regular DB backups (Railway offers automatic backups)
- [ ] Review rate limits for your traffic
- [ ] Test Telegram/Email/Discord notifications

---

## 📊 Database Migration

```bash
# Development — create and apply migration
npx prisma migrate dev --name your_migration_name

# Production — apply existing migrations
npx prisma migrate deploy

# View/edit data in browser
npx prisma studio

# Reset database (dev only!)
npx prisma migrate reset
```

---

## 🌐 Custom Domain

### Railway
Settings → Networking → Custom Domain → Add `yourdomain.com`
Add CNAME in your DNS: `yourdomain.com → your-app.railway.app`

### Render
Settings → Custom Domains → Add domain
Follow DNS instructions shown.

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      - name: Deploy
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Add `RAILWAY_TOKEN` in GitHub repo → Settings → Secrets.
