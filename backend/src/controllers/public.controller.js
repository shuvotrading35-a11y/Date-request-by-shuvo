'use strict';

const { prisma }                    = require('../config/db');
const { getRealIP, parseDevice, parseGeo } = require('../utils/device.util');
const { notifyAdminNewResponse, notifyUserNewResponse } = require('../services/notification.service');
const { logger }                    = require('../utils/logger');

// ── LOAD DATE REQUEST PAGE (receiver) ──
async function getPublicRequest(req, res) {
  try {
    const { token } = req.params;
    const request   = await prisma.dateRequest.findUnique({
      where: { token },
      include: { user: { select: { fullName: true, username: true } } },
    });

    if (!request || !request.isActive) {
      return res.status(404).json({ message: 'This date request was not found or is no longer active.' });
    }

    return res.json({
      id:          request.id,
      uuid:        request.uuid,
      senderName:  request.user.fullName || request.user.username,
      themeColor:  request.themeColor,
      secretLetter: request.secretLetter || null,
    });
  } catch (err) {
    logger.error('getPublicRequest: ' + err.message);
    return res.status(500).json({ message: 'Failed to load request' });
  }
}

// ── LOG VIEW ──
async function logView(req, res) {
  try {
    const { token } = req.params;
    const request   = await prisma.dateRequest.findUnique({ where: { token } });
    if (!request) return res.status(404).json({ message: 'Not found' });

    const ip      = getRealIP(req);
    const ua      = req.headers['user-agent'] || '';
    const { deviceType, browser } = parseDevice(ua);
    const { country }             = parseGeo(ip);

    await prisma.dateRequest.update({
      where: { id: request.id },
      data:  { viewCount: { increment: 1 } },
    });

    await prisma.analytics.create({
      data: {
        requestId: request.id,
        eventType: 'view',
        ipAddress: ip,
        country,
        device:    deviceType,
        browser,
      },
    });

    return res.json({ message: 'View logged' });
  } catch (err) {
    logger.error('logView: ' + err.message);
    return res.status(200).json({ message: 'ok' }); // silent fail
  }
}

// ── SUBMIT RESPONSE ──
async function submitResponse(req, res) {
  try {
    const { token } = req.params;
    const {
      receiverName,
      selectedFoods,
      selectedActivity,
      selectedPlace,
      selectedDate,
      selectedTime,
      loveMeter,
      personalMessage,
    } = req.body;

    const request = await prisma.dateRequest.findUnique({
      where:   { token },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });

    if (!request || !request.isActive) {
      return res.status(404).json({ message: 'Request not found or inactive' });
    }

    const ip      = getRealIP(req);
    const ua      = req.headers['user-agent'] || '';
    const { deviceType, browser } = parseDevice(ua);
    const { country }             = parseGeo(ip);

    const response = await prisma.response.create({
      data: {
        requestId:        request.id,
        receiverName:     receiverName?.trim() || null,
        selectedFoods:    JSON.stringify(Array.isArray(selectedFoods) ? selectedFoods : []),
        selectedActivity: selectedActivity || null,
        selectedPlace:    selectedPlace    || null,
        selectedDate:     selectedDate ? new Date(selectedDate) : null,
        selectedTime:     selectedTime     || null,
        loveMeter:        Math.min(100, Math.max(0, parseInt(loveMeter) || 50)),
        personalMessage:  personalMessage?.trim()?.slice(0, 300) || null,
        ipAddress:        ip,
        country,
        deviceType,
        browser,
        status: 'confirmed',
      },
    });

    // Analytics
    await prisma.analytics.create({
      data: { requestId: request.id, eventType: 'submit', ipAddress: ip, country, device: deviceType, browser },
    });

    // In-app notification for sender
    const notifMsg = `💌 Someone responded to your Date Request! ❤️ Love Meter: ${loveMeter}%`;
    await prisma.notification.create({
      data: {
        userId:      request.user.id,
        type:        'response',
        message:     notifMsg,
        referenceId: response.uuid,
      },
    });

    // Real-time WebSocket push to sender
    const io = req.app.get('io');
    if (io) {
      const payload = {
        type: 'new_response',
        data: {
          responseId:      response.uuid,
          senderName:      request.user.fullName || request.user.username,
          receiverName:    receiverName || 'Anonymous',
          loveMeter,
          selectedPlace,
          selectedActivity,
          country,
          deviceType,
        },
      };
      io.to(`user:${request.user.id}`).emit('message', JSON.stringify(payload));
      io.to('admins').emit('message', JSON.stringify(payload));
    }

    // Admin notifications (Telegram, Email, Discord)
    const fullResponse = {
      ...response,
      selectedFoods: selectedFoods,
      senderName:    request.user.fullName || request.user.username,
    };
    notifyAdminNewResponse(fullResponse).catch(err => logger.error('Admin notify error: ' + err.message));

    return res.status(201).json({
      message:    'Response submitted successfully! 💕',
      responseId: response.uuid,
    });
  } catch (err) {
    logger.error('submitResponse: ' + err.message);
    return res.status(500).json({ message: 'Failed to submit response' });
  }
}

module.exports = { getPublicRequest, logView, submitResponse };
