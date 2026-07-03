'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/response.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/',    authMiddleware, ctrl.listResponses);
router.get('/:id', authMiddleware, ctrl.getResponse);

module.exports = router;
