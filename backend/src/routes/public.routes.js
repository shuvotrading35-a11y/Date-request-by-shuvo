'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/public.controller');

router.get('/date/:token',          ctrl.getPublicRequest);
router.post('/date/:token/respond', ctrl.submitResponse);
router.post('/date/:token/view',    ctrl.logView);

module.exports = router;
