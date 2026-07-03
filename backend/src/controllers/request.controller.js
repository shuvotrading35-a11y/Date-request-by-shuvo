'use strict';

const { prisma }             = require('../config/db');
const { generateShareToken } = require('../utils/token.util');
const { auditLog }           = require('../services/audit.service');
const { getRealIP }          = require('../utils/device.util');
const { logger }             = require('../utils/logger');

// ── LIST OWN REQUESTS ──
async function listRequests(req, res) {
  try {
    const requests = await prisma.dateRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { responses: true } },
      },
    });

    const data = requests.map(r => ({
      id:            r.id,
      uuid:          r.uuid,
      token:         r.token,
      themeColor:    r.themeColor,
      isActive:      r.isActive,
      viewCount:     r.viewCount,
      responseCount: r._count.responses,
      createdAt:     r.createdAt,
      updatedAt:     r.updatedAt,
    }));

    return res.json({ requests: data, total: data.length });
  } catch (err) {
    logger.error('listRequests: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch requests' });
  }
}

// ── CREATE REQUEST ──
async function createRequest(req, res) {
  try {
    const { secretLetter, themeColor } = req.body;

    // Generate unique token
    let token, exists;
    do {
      token  = generateShareToken(parseInt(process.env.SHARE_TOKEN_LENGTH) || 10);
      exists = await prisma.dateRequest.findUnique({ where: { token } });
    } while (exists);

    const request = await prisma.dateRequest.create({
      data: {
        token,
        userId:       req.user.id,
        secretLetter: secretLetter?.trim() || null,
        themeColor:   themeColor || '#FF6B9D',
        isActive:     true,
      },
    });

    await auditLog(req.user.id, 'create_request', getRealIP(req), req.headers['user-agent'],
      JSON.stringify({ requestId: request.id, token }));

    return res.status(201).json({
      id:         request.id,
      uuid:       request.uuid,
      token:      request.token,
      themeColor: request.themeColor,
      isActive:   request.isActive,
      createdAt:  request.createdAt,
    });
  } catch (err) {
    logger.error('createRequest: ' + err.message);
    return res.status(500).json({ message: 'Failed to create request' });
  }
}

// ── GET SINGLE REQUEST ──
async function getRequest(req, res) {
  try {
    const request = await prisma.dateRequest.findFirst({
      where: { uuid: req.params.id, userId: req.user.id },
      include: { _count: { select: { responses: true } } },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    return res.json({
      ...request,
      responseCount: request._count.responses,
      _count: undefined,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch request' });
  }
}

// ── UPDATE REQUEST ──
async function updateRequest(req, res) {
  try {
    const { secretLetter, themeColor, isActive } = req.body;
    const request = await prisma.dateRequest.findFirst({
      where: { uuid: req.params.id, userId: req.user.id },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const updates = {};
    if (secretLetter !== undefined) updates.secretLetter = secretLetter?.trim() || null;
    if (themeColor   !== undefined) updates.themeColor   = themeColor;
    if (isActive     !== undefined) updates.isActive     = Boolean(isActive);

    const updated = await prisma.dateRequest.update({
      where: { id: request.id },
      data:  updates,
    });

    await auditLog(req.user.id, 'update_request', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Updated successfully', request: updated });
  } catch (err) {
    logger.error('updateRequest: ' + err.message);
    return res.status(500).json({ message: 'Failed to update request' });
  }
}

// ── DELETE REQUEST ──
async function deleteRequest(req, res) {
  try {
    const request = await prisma.dateRequest.findFirst({
      where: { uuid: req.params.id, userId: req.user.id },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await prisma.dateRequest.delete({ where: { id: request.id } });
    await auditLog(req.user.id, 'delete_request', getRealIP(req), req.headers['user-agent'],
      JSON.stringify({ token: request.token }));

    return res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    logger.error('deleteRequest: ' + err.message);
    return res.status(500).json({ message: 'Failed to delete request' });
  }
}

// ── REQUEST ANALYTICS ──
async function getRequestAnalytics(req, res) {
  try {
    const request = await prisma.dateRequest.findFirst({
      where: { uuid: req.params.id, userId: req.user.id },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const responses = await prisma.response.findMany({
      where: { requestId: request.id },
    });

    // Aggregate food counts
    const foods = {}, places = {}, activities = {};
    responses.forEach(r => {
      try {
        const foodList = JSON.parse(r.selectedFoods || '[]');
        foodList.forEach(f => { foods[f] = (foods[f] || 0) + 1; });
      } catch {}
      if (r.selectedPlace)    places[r.selectedPlace]       = (places[r.selectedPlace] || 0) + 1;
      if (r.selectedActivity) activities[r.selectedActivity] = (activities[r.selectedActivity] || 0) + 1;
    });

    // Responses over time (last 14 days)
    const now = new Date();
    const responsesOverTime = [];
    for (let i = 13; i >= 0; i--) {
      const d     = new Date(now);
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0,0,0,0));
      const end   = new Date(d.setHours(23,59,59,999));
      const count = responses.filter(r => r.submittedAt >= start && r.submittedAt <= end).length;
      responsesOverTime.push({
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      });
    }

    const avgLoveMeter = responses.length
      ? responses.reduce((sum, r) => sum + (r.loveMeter || 0), 0) / responses.length
      : 0;

    return res.json({ foods, places, activities, responsesOverTime, avgLoveMeter, total: responses.length });
  } catch (err) {
    logger.error('getRequestAnalytics: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

module.exports = { listRequests, createRequest, getRequest, updateRequest, deleteRequest, getRequestAnalytics };
