// src/routes/notifications.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

// GET /api/notifications — in-app notification history
router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const notifications = await prisma.notification.findMany({
      where: { userId: req.dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ notifications });
  } catch (err) { next(err); }
});

module.exports = router;
