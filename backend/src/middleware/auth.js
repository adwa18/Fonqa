// src/middleware/auth.js — Fonqa v3 (merged)
const crypto = require('crypto');
const logger = require('../utils/logger');
const { processReferral } = require('../routes/referrals');
const prisma = require('../lib/prisma'); // shared Prisma singleton

// ─────────────────────────────────────────────────────────────────────────────
// Core HMAC verification — with full diagnostic logging
// ─────────────────────────────────────────────────────────────────────────────
function verifyInitData(raw) {
  if (!raw || typeof raw !== 'string') {
    logger.warn('[auth] verifyInitData: raw value is empty or not a string');
    return null;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.error('[auth] TELEGRAM_BOT_TOKEN is not set');
    return null;
  }
  const cleanToken = token.trim();

  let params;
  try {
    params = new URLSearchParams(raw);
  } catch (e) {
    logger.warn(`[auth] URLSearchParams parse failed: ${e.message}`);
    return null;
  }

  const hash = params.get('hash');
  if (!hash) {
    logger.warn('[auth] initData missing hash');
    return null;
  }

  // Build data-check-string: all fields except hash, sorted, joined with \n
  const pairs = [];
  params.forEach((v, k) => { if (k !== 'hash') pairs.push(`${k}=${v}`); });
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  // HMAC-SHA256(data_check_string, HMAC-SHA256("WebAppData", bot_token))
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(cleanToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (expectedHash !== hash) {
    logger.warn(
      `[auth] HMAC mismatch. Token length: ${cleanToken.length}. ` +
      `Keys: ${pairs.map(p => p.split('=')[0]).join(', ')}`
    );
    return null;
  }

  // Check auth_date — reject if older than 24 hours
  const authDate = parseInt(params.get('auth_date'), 10);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > 86400) {
    logger.warn(`[auth] initData expired — age: ${ageSeconds}s`);
    return null;
  }

  // Parse user object
  const userRaw = params.get('user');
  if (!userRaw) {
    logger.warn('[auth] initData missing user field');
    return null;
  }

  try {
    return JSON.parse(userRaw);
  } catch (e) {
    logger.warn(`[auth] Failed to parse user JSON: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware
// ─────────────────────────────────────────────────────────────────────────────
async function authenticate(req, res, next) {
  try {
    // Dev bypass
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      req.telegramUser = { id: 111111111, first_name: 'Dev', username: 'devuser' };
      const db = req.app.get('prisma') || prisma;
      req.dbUser = await db.user.findFirst() || { id: 'dev', firstName: 'Dev', isBanned: false };
      return next();
    }

    const raw = req.headers['x-telegram-init-data'];
    if (!raw) {
      logger.warn(`[auth] Missing x-telegram-init-data header on ${req.method} ${req.path}`);
      return res.status(401).json({ error: 'Missing initData' });
    }

    const tgUser = verifyInitData(raw);
    if (!tgUser) {
      // verifyInitData already logged the specific reason
      return res.status(401).json({ error: 'Invalid initData' });
    }

    req.telegramUser = tgUser;
    const db = req.app.get('prisma') || prisma;

    // Handle referral deep link
    const refCode = req.headers['x-referral-code'];
    let referredById = null;
    if (refCode) {
      const referrer = await db.user.findUnique({ where: { referralCode: refCode } });
      if (referrer && String(referrer.telegramId) !== String(tgUser.id)) referredById = referrer.id;
    }

    const existingUser = await db.user.findUnique({ where: { telegramId: String(tgUser.id) } });
    const isNewUser = !existingUser;

    req.dbUser = await db.user.upsert({
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

    // (G) Increment referrer's count when a new user joins via invite link
    if (isNewUser && referredById) {
      processReferral(db, req.dbUser.id).catch(err =>
        logger.warn(`processReferral failed: ${err.message}`)
      );
    }

    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Account suspended', reason: req.dbUser.banReason });
    }

    // (I) Auto-reactivate on login if deactivated
    if (req.dbUser.isDeactivated) {
      await db.user.update({
        where: { id: req.dbUser.id },
        data: { isDeactivated: false, deactivatedAt: null, isActive: true },
      });
      req.dbUser.isDeactivated = false;
      req.dbUser.isActive = true;
    }

    // Ensure subscription row exists (first login)
    if (!req.dbUser.subscription) {
      const sub = await db.subscription.create({
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
    logger.error(`[auth] authenticate error: ${err.message}`, { stack: err.stack });
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin guard
// ─────────────────────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const ids = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim());
  if (!ids.includes(String(req.telegramUser?.id))) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io auth
// ─────────────────────────────────────────────────────────────────────────────
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
  } catch (err) {
    logger.error(`[auth] socketAuth error: ${err.message}`);
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Freemium chat check
// ─────────────────────────────────────────────────────────────────────────────
async function canChat(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, subscription: true },
  });
  if (!user) return false;
  if (user.profile?.gender === 'female') return true;
  const sub = user.subscription;
  if (!sub) return false;
  if (sub.tier === 'premium' && sub.premiumEnds && new Date() < new Date(sub.premiumEnds)) return true;
  if (sub.trialEnds && new Date() < new Date(sub.trialEnds)) return true;
  return false;
}

module.exports = { authenticate, requireAdmin, socketAuth, canChat };
