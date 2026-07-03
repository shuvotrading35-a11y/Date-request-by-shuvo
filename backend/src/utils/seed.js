'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt           = require('bcryptjs');
const { generateShareToken } = require('./token.util');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Admin User ──
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@daterequest.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        fullName:     'Super Admin',
        username:     adminUsername,
        email:        adminEmail,
        passwordHash,
        role:         'admin',
        isVerified:   true,
        isSuspended:  false,
      },
    });
    console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // ── Demo Sender ──
  const demoEmail = 'demo@daterequest.com';
  let demoUser = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!demoUser) {
    const passwordHash = await bcrypt.hash('Demo@123456', 12);
    demoUser = await prisma.user.create({
      data: {
        fullName:   'Shuvo Ahmed',
        username:   'shuvo_demo',
        email:      demoEmail,
        passwordHash,
        role:       'sender',
        isVerified: true,
      },
    });
    console.log(`✅ Demo user created: ${demoEmail} / Demo@123456`);
  } else {
    console.log('ℹ️  Demo user already exists');
  }

  // ── Demo Date Request ──
  const existing = await prisma.dateRequest.findFirst({ where: { userId: demoUser.id } });
  if (!existing) {
    let token;
    let tokenExists;
    do {
      token       = generateShareToken(10);
      tokenExists = await prisma.dateRequest.findUnique({ where: { token } });
    } while (tokenExists);

    const req = await prisma.dateRequest.create({
      data: {
        token,
        userId:       demoUser.id,
        secretLetter: 'Hey! I made this just for you 💕 I really hope you say yes, because you mean the world to me. Every moment with you is magical. 🌹',
        themeColor:   '#FF6B9D',
        isActive:     true,
        viewCount:    24,
      },
    });

    // ── Demo Response ──
    await prisma.response.create({
      data: {
        requestId:        req.id,
        receiverName:     'Sarah',
        selectedFoods:    JSON.stringify(['Pizza', 'Sushi', 'Ice Cream']),
        selectedActivity: 'Movie Night',
        selectedPlace:    'Coffee Shop',
        selectedDate:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        selectedTime:     '7:30 PM',
        loveMeter:        98,
        personalMessage:  "Can't wait to see you!! ❤️",
        country:          'BD',
        deviceType:       'mobile',
        browser:          'Chrome',
        status:           'confirmed',
      },
    });

    // ── Demo Notification ──
    await prisma.notification.create({
      data: {
        userId:  demoUser.id,
        type:    'response',
        message: '💌 Sarah responded to your Date Request! ❤️ Love Meter: 98%',
        isRead:  false,
      },
    });

    console.log(`✅ Demo request created. Share link: /date/${token}`);
  } else {
    console.log('ℹ️  Demo request already exists');
  }

  // ── Default Platform Settings ──
  const defaultSettings = [
    { key: 'siteName',    value: 'DateRequest Platform' },
    { key: 'maxRequests', value: '0' },
    { key: 'maintenance', value: 'false' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where:  { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    });
  }
  console.log('✅ Default settings saved');

  console.log('\n🎉 Seed complete!\n');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  Admin:  admin@daterequest.com / Admin@123456│');
  console.log('│  Demo:   demo@daterequest.com  / Demo@123456 │');
  console.log('└─────────────────────────────────────────────┘\n');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
