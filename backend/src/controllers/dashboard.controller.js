'use strict';

const { prisma } = require('../config/db');
const { logger } = require('../utils/logger');

// ── DASHBOARD STATS ──
async function getStats(req, res) {
  try {
    const userId = req.user.id;

    const [requests, responses, notifications] = await Promise.all([
      prisma.dateRequest.findMany({
        where: { userId },
        include: { _count: { select: { responses: true } } },
      }),
      prisma.response.findMany({
        where: { dateRequest: { userId } },
        select: { status: true, loveMeter: true },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const totalViews     = requests.reduce((s, r) => s + (r.viewCount || 0), 0);
    const totalResponses = responses.length;
    const confirmed      = responses.filter(r => r.status === 'confirmed').length;
    const yesRate        = totalResponses > 0 ? Math.round((confirmed / totalResponses) * 100) : 0;

    return res.json({
      totalRequests:  requests.length,
      totalViews,
      totalResponses,
      yesRate,
      unreadNotifications: notifications,
    });
  } catch (err) {
    logger.error('getStats: ' + err.message);
    return res.status(500).json({ message: 'Failed to load stats' });
  }
}

// ── NOTIFICATIONS ──
async function getNotifications(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take:    30,
      }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (err) {
    logger.error('getNotifications: ' + err.message);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

async function markNotificationRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { uuid: req.params.id, userId: req.user.id },
      data:  { isRead: true },
    });
    return res.json({ message: 'Marked as read' });
  } catch {
    return res.status(500).json({ message: 'Failed to mark as read' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true },
    });
    return res.json({ message: 'All marked as read' });
  } catch {
    return res.status(500).json({ message: 'Failed' });
  }
}

// ── EXPORT ──
async function exportData(req, res) {
  try {
    const { format = 'csv', requestId } = req.query;

    const where = requestId
      ? { dateRequest: { uuid: requestId, userId: req.user.id } }
      : { dateRequest: { userId: req.user.id } };

    const responses = await prisma.response.findMany({
      where,
      include: { dateRequest: { select: { token: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['ID','Receiver','Date','Time','Foods','Place','Activity','Love%','Message','Country','Device','Browser','Status','Submitted'];
      const rows = responses.map(r => [
        r.uuid,
        r.receiverName || '',
        r.selectedDate ? new Date(r.selectedDate).toLocaleDateString() : '',
        r.selectedTime || '',
        safeParseJSON(r.selectedFoods, []).join('; '),
        r.selectedPlace || '',
        r.selectedActivity || '',
        r.loveMeter || 0,
        (r.personalMessage || '').replace(/"/g, '""'),
        r.country || '',
        r.deviceType || '',
        r.browser || '',
        r.status || '',
        r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="date-responses.csv"');
      return res.send(csv);
    }

    if (format === 'pdf') {
      // Simple HTML → text PDF fallback (real PDF needs puppeteer/pdfkit)
      const html = `<!DOCTYPE html><html><body>
        <h1>Date Request Responses</h1>
        <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead><tr><th>#</th><th>Receiver</th><th>Date</th><th>Place</th><th>Love%</th><th>Status</th></tr></thead>
          <tbody>
            ${responses.map((r, i) => `<tr>
              <td>${i+1}</td>
              <td>${r.receiverName || '—'}</td>
              <td>${r.selectedDate ? new Date(r.selectedDate).toLocaleDateString() : '—'}</td>
              <td>${r.selectedPlace || '—'}</td>
              <td>${r.loveMeter || 0}%</td>
              <td>${r.status || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </body></html>`;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="date-responses.html"');
      return res.send(html);
    }

    return res.status(400).json({ message: 'Unsupported format. Use csv or pdf.' });
  } catch (err) {
    logger.error('exportData: ' + err.message);
    return res.status(500).json({ message: 'Export failed' });
  }
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = { getStats, getNotifications, markNotificationRead, markAllNotificationsRead, exportData };
