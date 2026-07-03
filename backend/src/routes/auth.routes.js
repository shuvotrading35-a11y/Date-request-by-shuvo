// ============ AUTH ROUTES ============
'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/register',        ctrl.register);
router.post('/login',           ctrl.login);
router.post('/logout',          ctrl.logout);
router.post('/refresh',         ctrl.refreshToken);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);
router.get('/check-username',   ctrl.checkUsername);
router.get('/me',     authMiddleware, ctrl.getMe);
router.patch('/me',   authMiddleware, ctrl.updateMe);

module.exports = router;
