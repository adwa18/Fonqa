// src/services/referralsService.js
const notify = require('../services/notifications'); // adjust path if needed

const REFERRAL_THRESHOLD = 10;

async function processReferral(prisma, newUserId) {
  const newUser = await prisma.user.findUnique({ where: { id: newUserId }, include: { referredBy: true } });
  if (!newUser?.referredById) return;

  const referrer = await prisma.user.update({
    where: { id: newUser.referredById },
    data: { referralCount: { increment: 1 } },
  });

  if (referrer.referralCount % REFERRAL_THRESHOLD === 0) {
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

module.exports = { processReferral };
