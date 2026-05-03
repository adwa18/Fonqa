// src/middleware/auth.js
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const prisma = new PrismaClient();

function verifyInitData(raw) {
  try {
    const params = new URLSearchParams(raw);
    const hash = params.get('hash');
    if (!hash) return null;
    const pairs = [];
    params.forEach((v, k) => { if (k !== 'hash') pairs.push(`${k}=${v}`); });
    pairs.sort();
    const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
    const expected = crypto.createHmac('sha256', secret).update(pairs.join('\n')).digest('hex');
    if (expected !== hash) return null;
    const age = Math.floor(Date.now() / 1000) - parseInt(params.get('auth_date'), 10);
    if (age > 86400) return null;
    return JSON.parse(params.get('user'));
  } catch { return null; }
}

async function authenticate(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      req.telegramUser = { id: 111111111, first_name: 'Dev', username: 'devuser' };
      req.dbUser = await prisma.user.findFirst();
      return next();
    }

    const raw = req.headers['x-telegram-init-data'];
    if (!raw) return res.status(401).json({ error: 'Missing initData' });

    const tgUser = verifyInitData(raw);
    if (!tgUser) return res.status(401).json({ error: 'Invalid initData' });

    req.telegramUser = tgUser;

    // Upsert user + handle referral from deep link
    const refCode = req.headers['x-referral-code'];
    let referredById = null;
    if (refCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: refCode } });
      if (referrer && String(referrer.telegramId) !== String(tgUser.id)) {
        referredById = referrer.id;
      }
    }

    req.dbUser = await prisma.user.upsert({
      where: { telegramId: String(tgUser.id) },
      update: {
        firstName: tgUser.first_name,
        lastName: tgUser.last_name || null,
        username: tgUser.username || null,
        photoUrl: tgUser.photo_url || null,
        lastSeen: new Date(),
      },
      create: {
        telegramId: String(tgUser.id),
        firstName: tgUser.first_name,
        lastName: tgUser.last_name || null,
        username: tgUser.username || null,
        photoUrl: tgUser.photo_url || null,
        referredById,
      },
      include: { profile: true, preferences: true, subscription: true },
    });

    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Account suspended', reason: req.dbUser.banReason });
    }

    // Ensure subscription row exists
    if (!req.dbUser.subscription) {
      const sub = await prisma.subscription.create({
        data: {
          userId: req.dbUser.id,
          tier: 'free',
          trialStarted: new Date(),
          trialEnds: new Date(Date.now() + 7 * 86400000),
        },
      });
      req.dbUser.subscription = sub;
    }

    next();
  } catch (err) {
    logger.error(`Auth error: ${err.message}`);
    next(err);
  }
}

function requireAdmin(req, res, next) {
  const ids = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim());
  if (!ids.includes(String(req.telegramUser?.id))) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

async function socketAuth(socket, next) {
  try {
    const raw = socket.handshake.auth?.initData;
    if (!raw) return next(new Error('Missing initData'));
    const tgUser = verifyInitData(raw);
    if (!tgUser) return next(new Error('Invalid initData'));
    const user = await prisma.user.findUnique({ where: { telegramId: String(tgUser.id) } });
    if (!user || user.isBanned) return next(new Error('User not found or banned'));
    socket.userId = user.id;
    socket.telegramId = user.telegramId;
    socket.firstName = user.firstName;
    next();
  } catch (err) { next(err); }
}

// Check if user can send messages (freemium logic)
async function canChat(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, subscription: true },
  });
  if (!user) return false;

  // Female users always free
  if (user.profile?.gender === 'female') return true;

  const sub = user.subscription;
  if (!sub) return false;

  // Active premium
  if (sub.tier === 'premium' && sub.premiumEnds && new Date() < new Date(sub.premiumEnds)) return true;

  // 7-day free trial
  if (sub.trialEnds && new Date() < new Date(sub.trialEnds)) return true;

  return false;
}

module.exports = { authenticate, requireAdmin, socketAuth, canChat };
