// src/routes/auth.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', authenticate, async (req, res) => {
  const { dbUser } = req;
  res.json({
    user: {
      id:           dbUser.id,
      telegramId:   dbUser.telegramId,
      firstName:    dbUser.firstName,
      lastName:     dbUser.lastName,
      username:     dbUser.username,
      photoUrl:     dbUser.photoUrl,
      referralCode: dbUser.referralCode,
    },
    hasProfile:   !!dbUser.profile?.profileComplete,
    subscription: dbUser.subscription,
  });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({
      where:   { id: req.dbUser.id },
      include: {
        profile:      true,
        photos:       { where: { isSelfie: false }, orderBy: { order: 'asc' } },
        preferences:  true,
        subscription: true,
        verification: true,
      },
    });
    res.json({ user });
  } catch (err) { next(err); }
});

// GET /api/auth/debug?secret=YOUR_ADMIN_ID
// Protected by your Telegram admin ID so it's safe in production.
router.get('/debug', (req, res) => {
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim());
  const secret   = req.query.secret || '';
  if (!adminIds.includes(secret)) {
    return res.status(403).json({ error: 'Provide ?secret=YOUR_TELEGRAM_ID' });
  }

  const initDataRaw = req.headers['x-telegram-init-data'] || '';

  res.json({
    receivedHeaders: {
      'x-telegram-init-data': initDataRaw ? `present (${initDataRaw.length} chars)` : '(missing)',
      'x-referral-code':      req.headers['x-referral-code'] || '(none)',
      'content-type':         req.headers['content-type']    || '(none)',
    },
    botToken: {
      set:    !!process.env.TELEGRAM_BOT_TOKEN,
      length: process.env.TELEGRAM_BOT_TOKEN?.trim().length ?? 0,
      // Show first/last 4 chars so you can confirm it's the right token
      // without exposing the full secret
      preview: process.env.TELEGRAM_BOT_TOKEN
        ? `${process.env.TELEGRAM_BOT_TOKEN.slice(0, 4)}...${process.env.TELEGRAM_BOT_TOKEN.slice(-4)}`
        : '(not set)',
    },
    nodeEnv: process.env.NODE_ENV,
    // If initData was sent, try to parse it and show what fields arrived
    initDataFields: initDataRaw
      ? (() => {
          try {
            const p = new URLSearchParams(initDataRaw);
            const fields = {};
            p.forEach((v, k) => { fields[k] = k === 'hash' ? v : `(${v.length} chars)`; });
            return fields;
          } catch (e) {
            return { parseError: e.message };
          }
        })()
      : null,
  });
});

module.exports = router;
