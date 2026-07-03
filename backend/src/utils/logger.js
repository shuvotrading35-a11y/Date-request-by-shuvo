'use strict';

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename:     path.join(logDir, 'app-%DATE%.log'),
  datePattern:  'YYYY-MM-DD',
  maxFiles:     '14d',
  maxSize:      '20m',
  zippedArchive: true,
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename:     path.join(logDir, 'error-%DATE%.log'),
  datePattern:  'YYYY-MM-DD',
  level:        'error',
  maxFiles:     '30d',
  maxSize:      '10m',
  zippedArchive: true,
});

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    fileRotateTransport,
    errorRotateTransport,
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      printf(({ level, message, timestamp, stack }) =>
        `${timestamp} ${level}: ${stack || message}`
      )
    ),
  }));
}

module.exports = { logger };
