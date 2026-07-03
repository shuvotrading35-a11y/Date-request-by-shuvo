'use strict';

const UAParser = require('ua-parser-js');
let geoip;
try { geoip = require('geoip-lite'); } catch { geoip = null; }

function parseDevice(userAgent) {
  if (!userAgent) return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  const parser  = new UAParser(userAgent);
  const result  = parser.getResult();
  const device  = result.device?.type || 'desktop';
  const browser = result.browser?.name || 'unknown';
  const os      = result.os?.name || 'unknown';
  return { deviceType: device, browser, os };
}

function parseGeo(ip) {
  if (!geoip || !ip || ip === '127.0.0.1' || ip === '::1') return { country: 'Unknown' };
  const geo = geoip.lookup(ip);
  return { country: geo?.country || 'Unknown', city: geo?.city || 'Unknown', timezone: geo?.timezone || 'Unknown' };
}

function getRealIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip
  );
}

module.exports = { parseDevice, parseGeo, getRealIP };
