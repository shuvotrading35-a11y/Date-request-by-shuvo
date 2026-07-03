'use strict';

const { prisma } = require('../config/db');
const { logger } = require('../utils/logger');

async function auditLog(userId, action, ipAddress, userAgent, metadata) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:    userId || null,
        action,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata:  metadata  || null,
      },
    });
  } catch (err) {
    logger.error('auditLog error: ' + err.message);
  }
}

module.exports = { auditLog };
