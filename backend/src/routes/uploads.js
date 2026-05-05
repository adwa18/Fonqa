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

// GET /api/auth/debug  — ONLY available in non-production
// Echoes back what the server actually received so you can confirm
// the initData header is arriving correctly.
router.get('/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    receivedHeaders: {
      'x-telegram-init-data': req.headers['x-telegram-init-data'] || '(missing)',
      'x-referral-code':      req.headers['x-referral-code']      || '(none)',
      'content-type':         req.headers['content-type']          || '(none)',
    },
    botTokenSet:    !!process.env.TELEGRAM_BOT_TOKEN,
    botTokenLength: process.env.TELEGRAM_BOT_TOKEN?.trim().length,
    nodeEnv:        process.env.NODE_ENV,
  });
});

module.exports = router;
