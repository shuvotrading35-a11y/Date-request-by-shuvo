'use strict';

const { verifyToken } = require('../utils/token.util');
const { prisma }      = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token   = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    const user    = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id:true, uuid:true, fullName:true, username:true, email:true, role:true, isSuspended:true },
    });
    if (!user)              return res.status(401).json({ message: 'User not found' });
    if (user.isSuspended)   return res.status(403).json({ message: 'Account suspended' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { authMiddleware };
