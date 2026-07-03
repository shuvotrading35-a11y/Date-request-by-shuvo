'use strict';

const { PrismaClient } = require('@prisma/client');
const { logger }       = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('error', (e) => logger.error('Prisma error: ' + e.message));

async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed: ' + err.message);
    process.exit(1);
  }
}

module.exports = { prisma, connectDB };
