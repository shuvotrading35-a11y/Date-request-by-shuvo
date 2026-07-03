'use strict';

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max:      parseInt(process.env.RATE_LIMIT_API_MAX)    || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 60_000,
  max:      parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many auth attempts. Please wait a minute.' },
});

const publicLimiter = rateLimit({
  windowMs: 60_000,
  max:      parseInt(process.env.RATE_LIMIT_PUBLIC_MAX) || 30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many requests.' },
});

module.exports = { limiter, authLimiter, publicLimiter };
