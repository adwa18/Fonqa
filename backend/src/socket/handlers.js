// src/socket/handlers.js
const { canChat } = require('../middleware/auth');
const { filterMessage, shouldFilter } = require('../services/contentFilter');
const notify = require('../services/notifications');
const logger = require('../utils/logger');

function registerSocketHandlers(io, socket, prisma) {
  const { userId, firstName } = socket;
  socket.join(`user:${userId}`);
  logger.info(`Socket connected: ${userId}`);

  socket.on('join:match', async ({ matchId }) => {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      return socket.emit('error', { message: 'Unauthorized' });
    }
    socket.join(`match:${matchId}`);
    socket.emit('joined:match', { matchId });
  });

  socket.on('leave:match', ({ matchId }) => socket.leave(`match:${matchId}`));

  socket.on('send:message', async ({ matchId, content, type = 'text' }) => {
    try {
      if (!content?.trim()) return;

      // Premium / trial check
      const allowed = await canChat(userId);
      if (!allowed) {
        return socket.emit('subscription:required', {
          message: 'Your free trial has ended. Upgrade to Fonqa Premium to continue chatting.',
          code: 'SUBSCRIPTION_REQUIRED',
        });
      }

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match || (match.userAId !== userId && match.userBId !== userId) || !match.isActive) {
        return socket.emit('error', { message: 'Cannot send to this match' });
      }

      // Content filter
      const needsFilter = await shouldFilter(prisma, matchId, userId);
      if (needsFilter) {
        const filterResult = filterMessage(content);
        if (filterResult.blocked) {
          return socket.emit('message:blocked', { reason: filterResult.reason });
        }
      }

      const trimmed = content.trim().slice(0, 2000);
      const message = await prisma.message.create({
        data: { matchId, senderId: userId, content: trimmed, type },
        include: { sender: { select: { id: true, firstName: true } } },
      });

      io.to(`match:${matchId}`).emit('new:message', {
        id: message.id, matchId, senderId: userId,
        senderName: firstName, content: trimmed, type,
        createdAt: message.createdAt,
      });

      // Notify the other user
      const otherId = match.userAId === userId ? match.userBId : match.userAId;
      const other = await prisma.user.findUnique({ where: { id: otherId }, select: { telegramId: true } });
      if (other) notify.notifyMessage(other.telegramId, firstName).catch(() => {});

    } catch (err) {
      logger.error(`send:message error: ${err.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing:start', ({ matchId }) => socket.to(`match:${matchId}`).emit('typing:start', { userId, firstName }));
  socket.on('typing:stop',  ({ matchId }) => socket.to(`match:${matchId}`).emit('typing:stop', { userId }));

  socket.on('messages:read', async ({ matchId }) => {
    await prisma.message.updateMany({
      where: { matchId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    }).catch(() => {});
    socket.to(`match:${matchId}`).emit('messages:read', { matchId, readBy: userId });
  });

  socket.on('disconnect', () => {
    prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } }).catch(() => {});
    logger.info(`Socket disconnected: ${userId}`);
  });
}

module.exports = { registerSocketHandlers };
