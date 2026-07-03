'use strict';

const { prisma } = require('../config/db');
const { logger } = require('../utils/logger');

// ── LIST OWN RESPONSES ──
async function listResponses(req, res) {
  try {
    const { requestId } = req.query;

    // Verify ownership if requestId given
    if (requestId) {
      const req2 = await prisma.dateRequest.findFirst({
        where: { uuid: requestId, userId: req.user.id },
      });
      if (!req2) return res.status(404).json({ message: 'Request not found' });
    }

    const userRequests = await prisma.dateRequest.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });
    const userRequestIds = userRequests.map(r => r.id);

    const where = requestId
      ? { dateRequest: { uuid: requestId, userId: req.user.id } }
      : { requestId: { in: userRequestIds } };

    const responses = await prisma.response.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { dateRequest: { select: { token: true, user: { select: { fullName: true } } } } },
    });

    const data = responses.map(r => ({
      id:               r.id,
      uuid:             r.uuid,
      receiverName:     r.receiverName,
      selectedFoods:    safeParseJSON(r.selectedFoods, []),
      selectedActivity: r.selectedActivity,
      selectedPlace:    r.selectedPlace,
      selectedDate:     r.selectedDate,
      selectedTime:     r.selectedTime,
      loveMeter:        r.loveMeter,
      personalMessage:  r.personalMessage,
      ipAddress:        r.ipAddress,
      country:          r.country,
      deviceType:       r.deviceType,
      browser:          r.browser,
      status:           r.status,
      submittedAt:      r.submittedAt,
      senderName:       r.dateRequest?.user?.fullName,
    }));

    return res.json({ responses: data, total: data.length });
  } catch (err) {
    logger.error('listResponses: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch responses' });
  }
}

// ── GET SINGLE RESPONSE ──
async function getResponse(req, res) {
  try {
    const response = await prisma.response.findFirst({
      where: {
        uuid: req.params.id,
        dateRequest: { userId: req.user.id },
      },
      include: { dateRequest: { select: { token: true, user: { select: { fullName: true } } } } },
    });

    if (!response) return res.status(404).json({ message: 'Response not found' });

    return res.json({
      ...response,
      selectedFoods: safeParseJSON(response.selectedFoods, []),
      senderName:    response.dateRequest?.user?.fullName,
    });
  } catch (err) {
    logger.error('getResponse: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch response' });
  }
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = { listResponses, getResponse };
