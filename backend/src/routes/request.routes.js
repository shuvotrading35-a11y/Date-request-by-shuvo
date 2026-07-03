'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/request.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/',                 authMiddleware, ctrl.listRequests);
router.post('/',                authMiddleware, ctrl.createRequest);
router.get('/:id',              authMiddleware, ctrl.getRequest);
router.put('/:id',              authMiddleware, ctrl.updateRequest);
router.delete('/:id',           authMiddleware, ctrl.deleteRequest);
router.get('/:id/analytics',    authMiddleware, ctrl.getRequestAnalytics);

module.exports = router;
