'use strict';

const bcrypt  = require('bcryptjs');
const { prisma } = require('../config/db');
const { generateAccessToken, generateRefreshToken, generateResetToken, verifyToken } = require('../utils/token.util');
const { getRealIP, parseDevice } = require('../utils/device.util');
const { auditLog } = require('../services/audit.service');
const { sendPasswordResetEmail } = require('../services/notification.service');
const { logger } = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const REFRESH_DAYS  = 30;

// ── REGISTER ──
async function register(req, res) {
  try {
    const { fullName, username, email, password } = req.body;

    // Check duplicates
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ message: `${field === 'email' ? 'Email' : 'Username'} already taken`, field });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        fullName,
        username: username.toLowerCase(),
        email:    email.toLowerCase(),
        passwordHash,
        role: 'sender',
      },
    });

    const accessToken  = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

    await prisma.session.create({
      data: {
        userId:       user.id,
        refreshToken,
        ipAddress:    getRealIP(req),
        userAgent:    req.headers['user-agent'] || '',
        expiresAt,
      },
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge:   REFRESH_DAYS * 24 * 60 * 60 * 1000,
    });

    await auditLog(user.id, 'register', getRealIP(req), req.headers['user-agent']);

    return res.status(201).json({
      access_token: accessToken,
      user: { id: user.uuid, fullName: user.fullName, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    logger.error('Register error: ' + err.message);
    return res.status(500).json({ message: 'Registration failed' });
  }
}

// ── LOGIN ──
async function login(req, res) {
  try {
    const { identifier, password, rememberMe } = req.body;
    const field = identifier.includes('@') ? 'email' : 'username';

    const user = await prisma.user.findUnique({
      where: { [field]: identifier.toLowerCase() },
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isSuspended) return res.status(403).json({ message: 'Account suspended. Contact admin.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken  = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    const days       = rememberMe ? 30 : 1;
    const expiresAt  = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await prisma.session.create({
      data: { userId: user.id, refreshToken, ipAddress: getRealIP(req), userAgent: req.headers['user-agent'] || '', expiresAt },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge:   days * 24 * 60 * 60 * 1000,
    });

    await auditLog(user.id, 'login', getRealIP(req), req.headers['user-agent']);

    return res.json({
      access_token: accessToken,
      user: { id: user.uuid, fullName: user.fullName, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    logger.error('Login error: ' + err.message);
    return res.status(500).json({ message: 'Login failed' });
  }
}

// ── LOGOUT ──
async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } });
    }
    res.clearCookie('refresh_token');
    if (req.user) await auditLog(req.user.id, 'logout', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Logout failed' });
  }
}

// ── REFRESH TOKEN ──
async function refreshToken(req, res) {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const session = await prisma.session.findUnique({ where: { refreshToken: token } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired or invalid' });
    }

    const payload   = verifyToken(token);
    const user      = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isSuspended) return res.status(401).json({ message: 'User not found or suspended' });

    const newAccess  = generateAccessToken({ userId: user.id, role: user.role });
    const newRefresh = generateRefreshToken({ userId: user.id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

    await prisma.session.update({
      where: { id: session.id },
      data:  { refreshToken: newRefresh, expiresAt },
    });

    res.cookie('refresh_token', newRefresh, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict',
      maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.json({ access_token: newAccess });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

// ── FORGOT PASSWORD ──
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return 200 to prevent user enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken  = generateResetToken();
    const expiresAt   = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.setting.upsert({
      where:  { key: `reset:${user.id}` },
      update: { value: JSON.stringify({ token: resetToken, expiresAt }) },
      create: { key:   `reset:${user.id}`, value: JSON.stringify({ token: resetToken, expiresAt }) },
    });

    await sendPasswordResetEmail(user.email, user.fullName, resetToken);
    await auditLog(user.id, 'forgot_password', getRealIP(req), req.headers['user-agent']);

    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot password: ' + err.message);
    return res.status(500).json({ message: 'Failed to process request' });
  }
}

// ── RESET PASSWORD ──
async function resetPassword(req, res) {
  try {
    const { token }    = req.params;
    const { password } = req.body;

    // Find user by reset token
    const settings = await prisma.setting.findMany({ where: { key: { startsWith: 'reset:' } } });
    let userId = null;

    for (const s of settings) {
      const data = JSON.parse(s.value);
      if (data.token === token && new Date(data.expiresAt) > new Date()) {
        userId = parseInt(s.key.replace('reset:', ''));
        await prisma.setting.delete({ where: { key: s.key } });
        break;
      }
    }

    if (!userId) return res.status(400).json({ message: 'Reset link is invalid or expired.' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId } }); // Invalidate all sessions

    await auditLog(userId, 'reset_password', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    logger.error('Reset password: ' + err.message);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
}

// ── CHECK USERNAME ──
async function checkUsername(req, res) {
  const { username } = req.query;
  if (!username || username.length < 3) return res.json({ available: false });
  const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  return res.json({ available: !exists });
}

// ── GET ME ──
async function getMe(req, res) {
  return res.json({
    id: req.user.uuid, fullName: req.user.fullName,
    username: req.user.username, email: req.user.email, role: req.user.role,
  });
}

// ── UPDATE ME ──
async function updateMe(req, res) {
  try {
    const { fullName, email, currentPassword, newPassword } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (email)    updates.email    = email.toLowerCase();

    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
      updates.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    }

    const updated = await prisma.user.update({ where: { id: req.user.id }, data: updates });
    await auditLog(req.user.id, 'update_profile', getRealIP(req), req.headers['user-agent']);

    return res.json({ message: 'Profile updated', user: { fullName: updated.fullName, email: updated.email } });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Email already in use' });
    return res.status(500).json({ message: 'Update failed' });
  }
}

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, checkUsername, getMe, updateMe };
