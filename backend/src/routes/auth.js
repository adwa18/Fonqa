// src/routes/auth.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.post('/login', authenticate, async (req, res) => {
  const { dbUser } = req;
  res.json({
    user: {
      id: dbUser.id, telegramId: dbUser.telegramId,
      firstName: dbUser.firstName, lastName: dbUser.lastName,
      username: dbUser.username, photoUrl: dbUser.photoUrl,
      referralCode: dbUser.referralCode,
    },
    hasProfile: !!dbUser.profile?.profileComplete,
    subscription: dbUser.subscription,
  });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.dbUser.id },
      include: { profile: true, photos: { where: { isSelfie: false }, orderBy: { order: 'asc' } }, preferences: true, subscription: true, verification: true },
    });
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
