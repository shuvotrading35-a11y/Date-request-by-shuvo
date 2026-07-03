'use strict';

const { prisma } = require('../config/db');
const { auditLog } = require('../services/audit.service');
const { getRealIP } = require('../utils/device.util');
const { logger } = require('../utils/logger');

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── PLATFORM STATS ──
async function getStats(req, res) {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalUsers, totalRequests, totalResponses, todayResponses, confirmed, pending] = await Promise.all([
      prisma.user.count({ where: { role: 'sender' } }),
      prisma.dateRequest.count(),
      prisma.response.count(),
      prisma.response.count({ where: { submittedAt: { gte: today } } }),
      prisma.response.count({ where: { status: 'confirmed' } }),
      prisma.response.count({ where: { status: 'pending' } }),
    ]);
    return res.json({ totalUsers, totalRequests, totalResponses, todayResponses, confirmed, pending });
  } catch (err) {
    logger.error('admin getStats: ' + err.message);
    return res.status(500).json({ message: 'Failed to load stats' });
  }
}

// ── ANALYTICS ──
async function getAnalytics(req, res) {
  try {
    const responses = await prisma.response.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 1000,
    });

    const foods = {}, places = {}, activities = {}, responsesPerDay = {};

    responses.forEach(r => {
      safeParseJSON(r.selectedFoods, []).forEach(f => { foods[f] = (foods[f] || 0) + 1; });
      if (r.selectedPlace)    places[r.selectedPlace]       = (places[r.selectedPlace] || 0) + 1;
      if (r.selectedActivity) activities[r.selectedActivity] = (activities[r.selectedActivity] || 0) + 1;

      const day = r.submittedAt?.toISOString().slice(0, 10);
      if (day) responsesPerDay[day] = (responsesPerDay[day] || 0) + 1;
    });

    return res.json({ foods, places, activities, responsesPerDay });
  } catch (err) {
    logger.error('admin getAnalytics: ' + err.message);
    return res.status(500).json({ message: 'Failed to load analytics' });
  }
}

// ── LIST USERS ──
async function listUsers(req, res) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { role: 'sender' };
    if (status === 'active')    where.isSuspended = false;
    if (status === 'suspended') where.isSuspended = true;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { username: { contains: search } },
        { email:    { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { dateRequests: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = await Promise.all(users.map(async u => {
      const responseCount = await prisma.response.count({
        where: { dateRequest: { userId: u.id } },
      });
      return {
        id: u.id, uuid: u.uuid, fullName: u.fullName, username: u.username,
        email: u.email, role: u.role, isSuspended: u.isSuspended,
        isVerified: u.isVerified, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
        requestCount: u._count.dateRequests, responseCount,
      };
    }));

    return res.json({ users: data, total, totalPages: Math.ceil(total / parseInt(limit)), page: parseInt(page) });
  } catch (err) {
    logger.error('admin listUsers: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
}

// ── GET SINGLE USER ──
async function getUser(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { uuid: req.params.id },
      include: { _count: { select: { dateRequests: true } } },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const responseCount = await prisma.response.count({
      where: { dateRequest: { userId: user.id } },
    });

    return res.json({
      id: user.id, uuid: user.uuid, fullName: user.fullName, username: user.username,
      email: user.email, role: user.role, isSuspended: user.isSuspended,
      createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
      requestCount: user._count.dateRequests, responseCount,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
}

// ── SUSPEND/UNSUSPEND USER ──
async function suspendUser(req, res) {
  try {
    const { suspended } = req.body;
    const user = await prisma.user.findUnique({ where: { uuid: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot suspend admin' });

    await prisma.user.update({ where: { id: user.id }, data: { isSuspended: Boolean(suspended) } });
    if (suspended) await prisma.session.deleteMany({ where: { userId: user.id } });

    await auditLog(req.user.id, suspended ? 'suspend_user' : 'unsuspend_user', getRealIP(req),
      req.headers['user-agent'], JSON.stringify({ targetUserId: user.id }));

    return res.json({ message: suspended ? 'User suspended' : 'User unsuspended' });
  } catch (err) {
    logger.error('suspendUser: ' + err.message);
    return res.status(500).json({ message: 'Failed to update user' });
  }
}

// ── DELETE USER ──
async function deleteUser(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { uuid: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

    await prisma.user.delete({ where: { id: user.id } });
    await auditLog(req.user.id, 'delete_user', getRealIP(req), req.headers['user-agent'],
      JSON.stringify({ deletedUserId: user.id, email: user.email }));

    return res.json({ message: 'User deleted' });
  } catch (err) {
    logger.error('deleteUser: ' + err.message);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
}

// ── LIST ALL REQUESTS ──
async function listRequests(req, res) {
  try {
    const { limit = 50, status, search } = req.query;
    const where = {};
    if (status === 'active')   where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const requests = await prisma.dateRequest.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user:   { select: { fullName: true, username: true } },
        _count: { select: { responses: true } },
      },
    });

    const data = requests.map(r => ({
      id: r.id, uuid: r.uuid, token: r.token,
      senderName: r.user.fullName || r.user.username,
      isActive: r.isActive, viewCount: r.viewCount,
      responseCount: r._count.responses,
      createdAt: r.createdAt,
    }));

    return res.json({ requests: data, total: data.length });
  } catch (err) {
    logger.error('admin listRequests: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch requests' });
  }
}

// ── DELETE REQUEST (admin) ──
async function deleteRequest(req, res) {
  try {
    const request = await prisma.dateRequest.findUnique({ where: { uuid: req.params.id } });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await prisma.dateRequest.delete({ where: { id: request.id } });
    await auditLog(req.user.id, 'admin_delete_request', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Request deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete request' });
  }
}

// ── LIST ALL RESPONSES ──
async function listResponses(req, res) {
  try {
    const { page = 1, limit = 20, status, device, search } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.status = status;
    if (device) where.deviceType = { contains: device };
    if (search) {
      where.OR = [
        { receiverName:     { contains: search } },
        { selectedPlace:    { contains: search } },
        { selectedActivity: { contains: search } },
        { country:          { contains: search } },
      ];
    }

    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { submittedAt: 'desc' },
        include: { dateRequest: { include: { user: { select: { fullName: true, username: true } } } } },
      }),
      prisma.response.count({ where }),
    ]);

    const data = responses.map(r => ({
      id: r.id, uuid: r.uuid,
      senderName:      r.dateRequest?.user?.fullName || r.dateRequest?.user?.username,
      receiverName:    r.receiverName,
      selectedFoods:   safeParseJSON(r.selectedFoods, []),
      selectedActivity: r.selectedActivity,
      selectedPlace:   r.selectedPlace,
      selectedDate:    r.selectedDate,
      selectedTime:    r.selectedTime,
      loveMeter:       r.loveMeter,
      personalMessage: r.personalMessage,
      ipAddress:       r.ipAddress,
      country:         r.country,
      deviceType:      r.deviceType,
      browser:         r.browser,
      status:          r.status,
      submittedAt:     r.submittedAt,
    }));

    return res.json({ responses: data, total, totalPages: Math.ceil(total / parseInt(limit)), page: parseInt(page) });
  } catch (err) {
    logger.error('admin listResponses: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch responses' });
  }
}

// ── GET SINGLE RESPONSE (admin) ──
async function getResponse(req, res) {
  try {
    const response = await prisma.response.findUnique({
      where: { uuid: req.params.id },
      include: { dateRequest: { include: { user: { select: { fullName: true, username: true } } } } },
    });
    if (!response) return res.status(404).json({ message: 'Response not found' });
    return res.json({
      ...response,
      selectedFoods: safeParseJSON(response.selectedFoods, []),
      senderName: response.dateRequest?.user?.fullName || response.dateRequest?.user?.username,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch response' });
  }
}

// ── UPDATE RESPONSE STATUS ──
async function updateResponseStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['pending','confirmed','rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    await prisma.response.update({ where: { uuid: req.params.id }, data: { status } });
    await auditLog(req.user.id, 'update_response_status', getRealIP(req), req.headers['user-agent'],
      JSON.stringify({ responseId: req.params.id, status }));
    return res.json({ message: 'Status updated' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update status' });
  }
}

// ── DELETE RESPONSE (admin) ──
async function deleteResponse(req, res) {
  try {
    const response = await prisma.response.findUnique({ where: { uuid: req.params.id } });
    if (!response) return res.status(404).json({ message: 'Response not found' });
    await prisma.response.delete({ where: { id: response.id } });
    await auditLog(req.user.id, 'admin_delete_response', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Response deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete response' });
  }
}

// ── EXPORT (admin) ──
async function exportData(req, res) {
  try {
    const { type = 'responses', format = 'csv' } = req.query;
    await auditLog(req.user.id, 'export', getRealIP(req), req.headers['user-agent'],
      JSON.stringify({ type, format }));

    if (type === 'users') {
      const users = await prisma.user.findMany({ where: { role: 'sender' }, orderBy: { createdAt: 'desc' } });
      if (format === 'csv') {
        const headers = ['UUID','Full Name','Username','Email','Suspended','Joined','Last Login'];
        const rows = users.map(u => [u.uuid, u.fullName, u.username, u.email,
          u.isSuspended, u.createdAt?.toISOString(), u.lastLoginAt?.toISOString() || '']);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        return res.send(csv);
      }
      if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="users.json"');
        return res.json(users.map(u => ({ uuid: u.uuid, fullName: u.fullName, username: u.username, email: u.email })));
      }
    }

    if (type === 'responses') {
      const responses = await prisma.response.findMany({
        orderBy: { submittedAt: 'desc' },
        include: { dateRequest: { include: { user: { select: { fullName: true } } } } },
      });
      if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="responses.json"');
        return res.json(responses.map(r => ({
          uuid: r.uuid, senderName: r.dateRequest?.user?.fullName,
          receiverName: r.receiverName, loveMeter: r.loveMeter,
          selectedPlace: r.selectedPlace, status: r.status, submittedAt: r.submittedAt,
        })));
      }
      const headers = ['UUID','Sender','Receiver','Date','Place','Activity','Love%','Country','Device','Status','Submitted'];
      const rows = responses.map(r => [
        r.uuid, r.dateRequest?.user?.fullName || '', r.receiverName || '',
        r.selectedDate?.toLocaleDateString() || '', r.selectedPlace || '',
        r.selectedActivity || '', r.loveMeter || 0, r.country || '',
        r.deviceType || '', r.status || '', r.submittedAt?.toISOString() || '',
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="responses.csv"');
      return res.send(csv);
    }

    return res.status(400).json({ message: 'Invalid export parameters' });
  } catch (err) {
    logger.error('admin exportData: ' + err.message);
    return res.status(500).json({ message: 'Export failed' });
  }
}

// ── AUDIT LOGS ──
async function getLogs(req, res) {
  try {
    const { action, date, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = action;
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0,0,0,0));
      const end   = new Date(d.setHours(23,59,59,999));
      where.createdAt = { gte: start, lte: end };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take:    parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, username: true } } },
    });

    return res.json({
      logs: logs.map(l => ({
        id: l.id, action: l.action,
        userName:  l.user?.fullName || l.user?.username || 'System',
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        metadata:  safeParseJSON(l.metadata, {}),
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    logger.error('getLogs: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch logs' });
  }
}

// ── NOTIFICATION SETTINGS ──
async function getNotifSettings(req, res) {
  try {
    const keys = ['telegramBotToken','telegramChatId','adminEmail','discordWebhook'];
    const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch settings' });
  }
}

async function saveNotifSettings(req, res) {
  try {
    const { telegramBotToken, telegramChatId, adminEmail, discordWebhook } = req.body;
    const entries = { telegramBotToken, telegramChatId, adminEmail, discordWebhook };
    for (const [key, value] of Object.entries(entries)) {
      if (value !== undefined) {
        await prisma.setting.upsert({
          where:  { key },
          update: { value: value || '' },
          create: { key, value: value || '' },
        });
      }
    }
    await auditLog(req.user.id, 'update_notif_settings', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Notification settings saved' });
  } catch (err) {
    logger.error('saveNotifSettings: ' + err.message);
    return res.status(500).json({ message: 'Failed to save settings' });
  }
}

async function testNotifications(req, res) {
  try {
    const { sendTelegramNotification, sendDiscordNotification } = require('../services/notification.service');
    const testData = {
      senderName: 'Test Sender', receiverName: 'Test Receiver',
      selectedDate: new Date(), selectedTime: '7:00 PM',
      selectedFoods: ['Pizza', 'Sushi'], selectedPlace: 'Coffee Shop',
      selectedActivity: 'Movie Night', loveMeter: 99,
      personalMessage: 'This is a test notification! 🧪',
      country: 'Bangladesh', deviceType: 'mobile', browser: 'Chrome',
      submittedAt: new Date(), uuid: 'TEST-001',
    };
    await Promise.allSettled([
      sendTelegramNotification(testData),
      sendDiscordNotification(testData),
    ]);
    return res.json({ message: 'Test notifications sent' });
  } catch (err) {
    return res.status(500).json({ message: 'Test failed: ' + err.message });
  }
}

// ── PLATFORM SETTINGS ──
async function getPlatformSettings(req, res) {
  try {
    const keys = ['siteName','maxRequests','maintenance'];
    const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const result = {};
    settings.forEach(s => { result[s.key] = s.key === 'maintenance' ? s.value === 'true' : s.value; });
    return res.json(result);
  } catch {
    return res.status(500).json({ message: 'Failed to fetch settings' });
  }
}

async function savePlatformSettings(req, res) {
  try {
    const { siteName, maxRequests, maintenance } = req.body;
    const entries = {
      siteName:    siteName    || 'DateRequest Platform',
      maxRequests: String(maxRequests || 0),
      maintenance: String(Boolean(maintenance)),
    };
    for (const [key, value] of Object.entries(entries)) {
      await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    await auditLog(req.user.id, 'update_platform_settings', getRealIP(req), req.headers['user-agent']);
    return res.json({ message: 'Platform settings saved' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save settings' });
  }
}

// ── DANGER ZONE ──
async function dangerAction(req, res) {
  try {
    const { action } = req.params;
    if (action === 'clear-responses') {
      await prisma.response.deleteMany({});
      await auditLog(req.user.id, 'danger_clear_responses', getRealIP(req), req.headers['user-agent']);
      return res.json({ message: 'All responses cleared' });
    }
    if (action === 'clear-logs') {
      await prisma.auditLog.deleteMany({});
      return res.json({ message: 'Audit logs cleared' });
    }
    return res.status(400).json({ message: 'Unknown action' });
  } catch (err) {
    logger.error('dangerAction: ' + err.message);
    return res.status(500).json({ message: 'Action failed' });
  }
}

module.exports = {
  getStats, getAnalytics,
  listUsers, getUser, suspendUser, deleteUser,
  listRequests, deleteRequest,
  listResponses, getResponse, updateResponseStatus, deleteResponse,
  exportData, getLogs,
  getNotifSettings, saveNotifSettings, testNotifications,
  getPlatformSettings, savePlatformSettings, dangerAction,
};
