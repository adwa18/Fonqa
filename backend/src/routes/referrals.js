// src/routes/referrals.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
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

// Called internally when a referred user completes onboarding
async function processReferral(prisma, newUserId) {
  const newUser = await prisma.user.findUnique({ where: { id: newUserId }, include: { referredBy: true } });
  if (!newUser?.referredById) return;

  const referrer = await prisma.user.update({
    where: { id: newUser.referredById },
    data: { referralCount: { increment: 1 } },
  });

  // Every REFERRAL_THRESHOLD referrals → grant reward
  if (referrer.referralCount % REFERRAL_THRESHOLD === 0) {
    // Grant 2-day chat extension
    const sub = await prisma.subscription.findUnique({ where: { userId: referrer.id } });
    const baseDate = (sub?.premiumEnds && new Date(sub.premiumEnds) > new Date())
      ? new Date(sub.premiumEnds)
      : new Date();
    const newEnd = new Date(baseDate.getTime() + 2 * 86400000);

    await prisma.subscription.upsert({
      where: { userId: referrer.id },
      update: { tier: 'premium', premiumEnds: newEnd },
      create: { userId: referrer.id, tier: 'premium', premiumStarts: new Date(), premiumEnds: newEnd },
    });

    notify.notifyReferralReward(referrer.telegramId, '🎁 You earned a 2-day chat extension for referring 10 friends!').catch(() => {});
  }
}

module.exports = router;
module.exports.processReferral = processReferral;
