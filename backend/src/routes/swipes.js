// src/routes/swipes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getCandidates, recordSwipe, getWhoLikedMe } = require('../services/matching');
const notify = require('../services/notifications');

router.get('/candidates', authenticate, async (req, res, next) => {
  try {
    const candidates = await getCandidates(req.dbUser.id);
    res.json({ candidates });
  } catch (err) {
    if (err.message.includes('incomplete')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.get('/liked-me', authenticate, async (req, res, next) => {
  try {
    const likes = await getWhoLikedMe(req.dbUser.id);
    res.json({ likes });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { receiverId, direction } = req.body;
    if (!receiverId || !['like', 'pass', 'superlike'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid swipe data' });
    }

    const result = await recordSwipe(req.dbUser.id, receiverId, direction);
    const io = req.app.get('io');
    const prisma = req.app.get('prisma');

    if (result.isMatch) {
      io.to(`user:${receiverId}`).emit('match', { matchId: result.matchId, with: { id: req.dbUser.id, firstName: req.dbUser.firstName } });
      // Telegram notification
      const other = await prisma.user.findUnique({ where: { id: receiverId }, select: { telegramId: true } });
      if (other) notify.notifyMatch(other.telegramId, req.dbUser.firstName).catch(() => {});
    } else if (direction === 'like' || direction === 'superlike') {
      // Notify the liked user
      const other = await prisma.user.findUnique({ where: { id: receiverId }, select: { telegramId: true } });
      if (other) notify.notifyLike(other.telegramId, req.dbUser.firstName).catch(() => {});
      io.to(`user:${receiverId}`).emit('new:like', { from: { id: req.dbUser.id, firstName: req.dbUser.firstName } });
    }

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
