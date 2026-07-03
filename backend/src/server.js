'use strict';

require('dotenv').config();
const express       = require('express');
const http          = require('http');
const path          = require('path');
const cors          = require('cors');
const helmet        = require('helmet');
const compression   = require('compression');
const cookieParser  = require('cookie-parser');
const morgan        = require('morgan');
const { Server }    = require('socket.io');

const { connectDB }       = require('./config/db');
const { logger }          = require('./utils/logger');
const { limiter, authLimiter, publicLimiter } = require('./middleware/rateLimit.middleware');

// Routes
const authRoutes      = require('./routes/auth.routes');
const requestRoutes   = require('./routes/request.routes');
const responseRoutes  = require('./routes/response.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes     = require('./routes/admin.routes');
const publicRoutes    = require('./routes/public.routes');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ──
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});
app.set('io', io);

// ── Security Headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc:    ["'self'", 'fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
}));

// ── Body Parsing ──
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Logging ──
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   (req) => req.path === '/health',
}));

// ── Rate Limiting ──
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/public', publicLimiter);
app.use('/api/v1', limiter);

// ── Serve Frontend ──
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath, { maxAge: '1d' }));

// ── API Routes ──
app.use('/api/v1/auth',      authRoutes);
app.use('/api/v1/public',    publicRoutes);
app.use('/api/v1/requests',  requestRoutes);
app.use('/api/v1/responses', responseRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin',     adminRoutes);

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── SPA Fallback ──
app.get('/date/:token', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard', 'index.html'));
});
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin', 'index.html'));
});
app.get('/auth/*', (req, res) => {
  const page = req.path.replace('/auth/', '') || 'login.html';
  res.sendFile(path.join(frontendPath, 'auth', page));
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message} — ${req.originalUrl} — ${req.ip}`);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message;
  res.status(status).json({ message });
});

// ── WebSocket Auth & Rooms ──
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const jwt  = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId   = payload.userId;
    socket.userRole = payload.role;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  if (socket.userRole === 'admin') socket.join('admins');
  logger.info(`WS connected: user ${socket.userId}`);
  socket.on('disconnect', () => logger.info(`WS disconnected: user ${socket.userId}`));
});

// ── Start ──
const PORT = process.env.PORT || 3000;
(async () => {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
})();

module.exports = { app, io };
