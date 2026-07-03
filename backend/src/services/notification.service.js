'use strict';

const { prisma } = require('../config/db');
const { logger } = require('../utils/logger');

// ── Get setting from DB ──
async function getSetting(key) {
  try {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value || process.env[key.toUpperCase()] || '';
  } catch { return ''; }
}

// ============================================
// TELEGRAM NOTIFICATION
// ============================================
async function sendTelegramNotification(response) {
  try {
    const botToken = await getSetting('telegramBotToken') || process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = await getSetting('telegramChatId')   || process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    const foods    = Array.isArray(response.selectedFoods)
      ? response.selectedFoods.join(', ')
      : JSON.parse(response.selectedFoods || '[]').join(', ');

    const date = response.selectedDate
      ? new Date(response.selectedDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
      : '—';

    const loveBar = '❤️'.repeat(Math.round((response.loveMeter || 0) / 20));

    const text = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      '💌 <b>NEW DATE REQUEST RESPONSE</b>',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `👤 <b>Sender:</b>     ${escTG(response.senderName || '—')}`,
      `👤 <b>Receiver:</b>   ${escTG(response.receiverName || 'Anonymous')}`,
      `📅 <b>Date:</b>       ${escTG(date)}`,
      `⏰ <b>Time:</b>       ${escTG(response.selectedTime || '—')}`,
      `🍕 <b>Food:</b>       ${escTG(foods || '—')}`,
      `📍 <b>Place:</b>      ${escTG(response.selectedPlace || '—')}`,
      `🎬 <b>Activity:</b>   ${escTG(response.selectedActivity || '—')}`,
      `❤️ <b>Love Meter:</b> ${response.loveMeter || 0}% ${loveBar}`,
      response.personalMessage ? `💬 <b>Message:</b>   <i>${escTG(response.personalMessage)}</i>` : '',
      '',
      `🌍 <b>Country:</b>   ${escTG(response.country || '—')}`,
      `📱 <b>Device:</b>    ${escTG(response.deviceType || '—')}`,
      `🌐 <b>Browser:</b>   ${escTG(response.browser || '—')}`,
      `🕐 <b>Submitted:</b> ${response.submittedAt ? new Date(response.submittedAt).toLocaleString() : '—'}`,
      `🆔 <b>Response ID:</b> <code>${response.uuid || '—'}</code>`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].filter(l => l !== null).join('\n');

    const url  = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error('Telegram notify failed: ' + err);
    } else {
      logger.info('Telegram notification sent');
    }
  } catch (err) {
    logger.error('sendTelegramNotification error: ' + err.message);
  }
}

function escTG(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================
// DISCORD WEBHOOK
// ============================================
async function sendDiscordNotification(response) {
  try {
    const webhookUrl = await getSetting('discordWebhook') || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const foods = Array.isArray(response.selectedFoods)
      ? response.selectedFoods.join(', ')
      : JSON.parse(response.selectedFoods || '[]').join(', ');

    const date = response.selectedDate
      ? new Date(response.selectedDate).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
      : '—';

    const embed = {
      title:       '💌 New Date Request Response!',
      color:       0xFF6B9D,
      timestamp:   new Date().toISOString(),
      thumbnail:   { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f48c.png' },
      fields: [
        { name: '👤 Sender',       value: response.senderName   || '—', inline: true },
        { name: '👤 Receiver',     value: response.receiverName || 'Anonymous', inline: true },
        { name: '📅 Date',         value: date,                          inline: false },
        { name: '⏰ Time',         value: response.selectedTime || '—',  inline: true },
        { name: '📍 Place',        value: response.selectedPlace || '—', inline: true },
        { name: '🎬 Activity',     value: response.selectedActivity || '—', inline: true },
        { name: '🍕 Food',         value: foods || '—',                  inline: false },
        { name: '❤️ Love Meter',  value: `${response.loveMeter || 0}%`, inline: true },
        { name: '🌍 Country',      value: response.country || '—',       inline: true },
        { name: '📱 Device',       value: response.deviceType || '—',    inline: true },
      ],
      footer: { text: 'DateRequest Platform' },
    };

    if (response.personalMessage) {
      embed.description = `> *"${response.personalMessage}"*`;
    }

    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) logger.error('Discord notify failed: ' + await res.text());
    else logger.info('Discord notification sent');
  } catch (err) {
    logger.error('sendDiscordNotification error: ' + err.message);
  }
}

// ============================================
// EMAIL NOTIFICATION (Admin)
// ============================================
async function sendAdminEmailNotification(response) {
  try {
    const adminEmail = await getSetting('adminEmail') || process.env.SMTP_USER;
    if (!adminEmail || !process.env.SMTP_HOST) return;

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const foods = Array.isArray(response.selectedFoods)
      ? response.selectedFoods.join(', ')
      : JSON.parse(response.selectedFoods || '[]').join(', ');

    const date = response.selectedDate
      ? new Date(response.selectedDate).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
      : '—';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #FFF0F5; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; box-shadow: 0 4px 20px rgba(255,107,157,0.15); }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #FF6B9D; font-size: 28px; margin: 0; }
    .header p  { color: #9B6B7F; margin: 8px 0 0; }
    .row { display: flex; padding: 10px 0; border-bottom: 1px solid #FFF0F5; }
    .label { width: 120px; flex-shrink: 0; font-weight: 700; color: #9B6B7F; font-size: 14px; }
    .value { color: #1A0A12; font-size: 14px; }
    .love  { color: #FF6B9D; font-weight: 700; font-size: 18px; }
    .footer { text-align: center; margin-top: 24px; color: #9B6B7F; font-size: 12px; }
    .badge { display: inline-block; background: rgba(255,107,157,0.1); color: #FF6B9D; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>💌 New Date Response!</h1>
      <p>Someone responded to a Date Request</p>
    </div>
    <div class="row"><span class="label">👤 Sender</span><span class="value">${response.senderName || '—'}</span></div>
    <div class="row"><span class="label">👤 Receiver</span><span class="value">${response.receiverName || 'Anonymous'}</span></div>
    <div class="row"><span class="label">📅 Date</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">⏰ Time</span><span class="value">${response.selectedTime || '—'}</span></div>
    <div class="row"><span class="label">🍕 Food</span><span class="value">${foods || '—'}</span></div>
    <div class="row"><span class="label">📍 Place</span><span class="value">${response.selectedPlace || '—'}</span></div>
    <div class="row"><span class="label">🎬 Activity</span><span class="value">${response.selectedActivity || '—'}</span></div>
    <div class="row"><span class="label">❤️ Love</span><span class="love">${response.loveMeter || 0}%</span></div>
    ${response.personalMessage ? `<div class="row"><span class="label">💬 Message</span><span class="value"><i>"${response.personalMessage}"</i></span></div>` : ''}
    <div class="row"><span class="label">🌍 Country</span><span class="value">${response.country || '—'}</span></div>
    <div class="row"><span class="label">📱 Device</span><span class="value">${response.deviceType || '—'}</span></div>
    <div class="footer">
      <p>DateRequest Platform Admin Notification</p>
      <p>Response ID: <code>${response.uuid || '—'}</code></p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from:    process.env.SMTP_FROM || `"DateRequest 💌" <${process.env.SMTP_USER}>`,
      to:      adminEmail,
      subject: `💌 New Date Response — Love Meter: ${response.loveMeter || 0}%`,
      html,
    });

    logger.info('Admin email notification sent');
  } catch (err) {
    logger.error('sendAdminEmailNotification error: ' + err.message);
  }
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================
async function sendPasswordResetEmail(email, fullName, resetToken) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

    const nodemailer  = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password.html?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #FFF0F5; padding: 20px; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 480px; margin: 0 auto; text-align: center; }
  h1 { color: #FF6B9D; } p { color: #6B3A52; line-height: 1.6; }
  .btn { display: inline-block; background: linear-gradient(135deg,#FF6B9D,#C23B77); color: white;
         padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 700;
         font-size: 16px; margin: 24px 0; }
  .hint { font-size: 12px; color: #9B6B7F; margin-top: 16px; }
  code { background: #FFF0F5; padding: 4px 8px; border-radius: 6px; font-family: monospace; word-break: break-all; }
</style>
</head>
<body>
<div class="card">
  <div style="font-size: 3rem;">🔐</div>
  <h1>Reset Your Password</h1>
  <p>Hi <b>${fullName}</b>,<br>We received a request to reset your DateRequest password.</p>
  <a href="${resetUrl}" class="btn">Reset Password 🔑</a>
  <p class="hint">This link expires in 1 hour.<br>If you didn't request this, ignore this email.</p>
  <p class="hint">Or copy this URL:<br><code>${resetUrl}</code></p>
</div>
</body>
</html>`;

    await transporter.sendMail({
      from:    process.env.SMTP_FROM || `"DateRequest 💌" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: '🔐 Reset Your DateRequest Password',
      html,
    });

    logger.info('Password reset email sent to: ' + email);
  } catch (err) {
    logger.error('sendPasswordResetEmail error: ' + err.message);
  }
}

// ============================================
// COMBINED ADMIN NOTIFY
// ============================================
async function notifyAdminNewResponse(response) {
  await Promise.allSettled([
    sendTelegramNotification(response),
    sendAdminEmailNotification(response),
    sendDiscordNotification(response),
  ]);
}

async function notifyUserNewResponse(userId, response) {
  // In-app only — handled in public.controller via WebSocket + DB notification
}

module.exports = {
  sendTelegramNotification,
  sendDiscordNotification,
  sendAdminEmailNotification,
  sendPasswordResetEmail,
  notifyAdminNewResponse,
  notifyUserNewResponse,
};
