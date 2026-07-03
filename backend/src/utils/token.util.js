'use strict';

const jwt  = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

// ── Share Token ──
function generateShareToken(length = 10) {
  let token = '';
  for (let i = 0; i < length; i++) {
    token += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return token;
}

// ── JWT ──
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d',
  });
}

function generateResetToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateShareToken,
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyToken,
  decodeToken,
};
