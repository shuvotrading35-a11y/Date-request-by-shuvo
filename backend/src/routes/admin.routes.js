'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { adminMiddleware } = require('../middleware/admin.middleware');

router.get('/stats',     adminMiddleware, ctrl.getStats);
router.get('/analytics', adminMiddleware, ctrl.getAnalytics);

router.get('/users',               adminMiddleware, ctrl.listUsers);
router.get('/users/:id',           adminMiddleware, ctrl.getUser);
router.patch('/users/:id/suspend', adminMiddleware, ctrl.suspendUser);
router.delete('/users/:id',        adminMiddleware, ctrl.deleteUser);

router.get('/requests',            adminMiddleware, ctrl.listRequests);
router.delete('/requests/:id',     adminMiddleware, ctrl.deleteRequest);

router.get('/responses',               adminMiddleware, ctrl.listResponses);
router.get('/responses/:id',           adminMiddleware, ctrl.getResponse);
router.patch('/responses/:id/status',  adminMiddleware, ctrl.updateResponseStatus);
router.delete('/responses/:id',        adminMiddleware, ctrl.deleteResponse);

router.get('/export',              adminMiddleware, ctrl.exportData);
router.get('/logs',                adminMiddleware, ctrl.getLogs);

router.get('/settings/notifications',        adminMiddleware, ctrl.getNotifSettings);
router.post('/settings/notifications',       adminMiddleware, ctrl.saveNotifSettings);
router.post('/settings/notifications/test',  adminMiddleware, ctrl.testNotifications);
router.get('/settings/platform',             adminMiddleware, ctrl.getPlatformSettings);
router.post('/settings/platform',            adminMiddleware, ctrl.savePlatformSettings);

router.delete('/danger/:action',   adminMiddleware, ctrl.dangerAction);

module.exports = router;
