// src/routes/referrals.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { processReferral } = require('../services/referralsService');
const notify = require('../services/notifications');

const REFERRAL_THRESHOLD = 10;

// GET /api/referrals/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.dbUser.id },
      select: { referralCode: true, referralCount: true, referrals: { select: { id: true, firstName: true, createdAt: true } } },
    });

    const appUrl = process.env.WEBAPP_URL || '';
    const inviteLink = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${user.referralCode}`;

    res.json({
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      inviteLink,
      threshold: REFERRAL_THRESHOLD,
      progress: user.referralCount % REFERRAL_THRESHOLD,
      reward: '1 Super Like or 2-day chat extension',
      referrals: user.referrals.map(r => ({ id: r.id, firstName: r.firstName, joinedAt: r.createdAt })),
    });
  } catch (err) { next(err); }
});



module.exports = router;

