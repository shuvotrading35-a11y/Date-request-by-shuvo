'use strict';

const { authMiddleware } = require('./auth.middleware');

async function adminMiddleware(req, res, next) {
  await authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
}

module.exports = { adminMiddleware };
