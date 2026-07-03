// ============ REQUEST ROUTES ============
'use strict';
const express = require('express');

// ── Request Routes ──
const reqRouter = express.Router();
const reqCtrl   = require('../controllers/request.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

reqRouter.get('/',           authMiddleware, reqCtrl.listRequests);
reqRouter.post('/',          authMiddleware, reqCtrl.createRequest);
reqRouter.get('/:id',        authMiddleware, reqCtrl.getRequest);
reqRouter.put('/:id',        authMiddleware, reqCtrl.updateRequest);
reqRouter.delete('/:id',     authMiddleware, reqCtrl.deleteRequest);
reqRouter.get('/:id/analytics', authMiddleware, reqCtrl.getRequestAnalytics);

// ── Response Routes ──
const resRouter = express.Router();
const resCtrl   = require('../controllers/response.controller');

resRouter.get('/',     authMiddleware, resCtrl.listResponses);
resRouter.get('/:id',  authMiddleware, resCtrl.getResponse);

// ── Dashboard Routes ──
const dashRouter = express.Router();
const dashCtrl   = require('../controllers/dashboard.controller');

dashRouter.get('/stats',                          authMiddleware, dashCtrl.getStats);
dashRouter.get('/notifications',                  authMiddleware, dashCtrl.getNotifications);
dashRouter.patch('/notifications/:id/read',       authMiddleware, dashCtrl.markNotificationRead);
dashRouter.patch('/notifications/read-all',       authMiddleware, dashCtrl.markAllNotificationsRead);
dashRouter.get('/export',                         authMiddleware, dashCtrl.exportData);

// ── Public Routes ──
const pubRouter = express.Router();
const pubCtrl   = require('../controllers/public.controller');

pubRouter.get('/date/:token',          pubCtrl.getPublicRequest);
pubRouter.post('/date/:token/respond', pubCtrl.submitResponse);
pubRouter.post('/date/:token/view',    pubCtrl.logView);

// ── Admin Routes ──
const adminRouter = express.Router();
const adminCtrl   = require('../controllers/admin.controller');
const { adminMiddleware } = require('../middleware/admin.middleware');

adminRouter.get('/stats',     adminMiddleware, adminCtrl.getStats);
adminRouter.get('/analytics', adminMiddleware, adminCtrl.getAnalytics);

adminRouter.get('/users',                  adminMiddleware, adminCtrl.listUsers);
adminRouter.get('/users/:id',              adminMiddleware, adminCtrl.getUser);
adminRouter.patch('/users/:id/suspend',    adminMiddleware, adminCtrl.suspendUser);
adminRouter.delete('/users/:id',           adminMiddleware, adminCtrl.deleteUser);

adminRouter.get('/requests',               adminMiddleware, adminCtrl.listRequests);
adminRouter.delete('/requests/:id',        adminMiddleware, adminCtrl.deleteRequest);

adminRouter.get('/responses',              adminMiddleware, adminCtrl.listResponses);
adminRouter.get('/responses/:id',          adminMiddleware, adminCtrl.getResponse);
adminRouter.patch('/responses/:id/status', adminMiddleware, adminCtrl.updateResponseStatus);
adminRouter.delete('/responses/:id',       adminMiddleware, adminCtrl.deleteResponse);

adminRouter.get('/export',                 adminMiddleware, adminCtrl.exportData);
adminRouter.get('/logs',                   adminMiddleware, adminCtrl.getLogs);

adminRouter.get('/settings/notifications',       adminMiddleware, adminCtrl.getNotifSettings);
adminRouter.post('/settings/notifications',      adminMiddleware, adminCtrl.saveNotifSettings);
adminRouter.post('/settings/notifications/test', adminMiddleware, adminCtrl.testNotifications);
adminRouter.get('/settings/platform',            adminMiddleware, adminCtrl.getPlatformSettings);
adminRouter.post('/settings/platform',           adminMiddleware, adminCtrl.savePlatformSettings);

adminRouter.delete('/danger/:action',      adminMiddleware, adminCtrl.dangerAction);

module.exports = { reqRouter, resRouter, dashRouter, pubRouter, adminRouter };
