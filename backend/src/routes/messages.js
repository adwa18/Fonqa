// src/routes/messages.js
const router = require('express').Router();
const { authenticate, canChat } = require('../middleware/auth');
const notify = require('../services/notifications');

router.get('/:matchId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const userId = req.dbUser.id;
    const { matchId } = req.params;
    const cursor = req.query.cursor;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, firstName: true } } },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    await prisma.message.updateMany({
      where: { matchId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ messages: messages.reverse(), nextCursor: hasMore ? messages[0]?.id : null });
  } catch (err) { next(err); }
});

// REST message send (fallback when socket is not available)
router.post('/:matchId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const io = req.app.get('io');
    const userId = req.dbUser.id;
    const { matchId } = req.params;
    const { content } = req.body;

    // Premium / trial check
    const allowed = await canChat(userId);
    if (!allowed) {
      return res.status(403).json({
        error: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your free trial has ended. Upgrade to Fonqa Premium to continue chatting.',
      });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const message = await prisma.message.create({
      data: { matchId, senderId: userId, content: content.slice(0, 2000) },
      include: { sender: { select: { id: true, firstName: true } } },
    });

    io.to(`match:${matchId}`).emit('new:message', message);

    // Telegram notification
    const otherId = match.userAId === userId ? match.userBId : match.userAId;
    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { telegramId: true } });
    if (other) notify.notifyMessage(other.telegramId, req.dbUser.firstName).catch(() => {});

    res.json({ message });
  } catch (err) { next(err); }
});

module.exports = router;
