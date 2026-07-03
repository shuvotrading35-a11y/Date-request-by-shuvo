'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/stats',                      authMiddleware, ctrl.getStats);
router.get('/notifications',              authMiddleware, ctrl.getNotifications);
router.patch('/notifications/read-all',   authMiddleware, ctrl.markAllNotificationsRead);
router.patch('/notifications/:id/read',   authMiddleware, ctrl.markNotificationRead);
router.get('/export',                     authMiddleware, ctrl.exportData);

module.exports = router;
