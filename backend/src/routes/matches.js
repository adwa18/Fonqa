// src/routes/matches.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const userId = req.dbUser.id;
    const matches = await prisma.match.findMany({
      where: { isActive: true, OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { include: { profile: { select: { age: true, city: true } }, photos: { where: { isMain: true }, take: 1 } } },
        userB: { include: { profile: { select: { age: true, city: true } }, photos: { where: { isMain: true }, take: 1 } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = matches.map(m => {
      const other = m.userAId === userId ? m.userB : m.userA;
      return {
        matchId: m.id,
        matchedAt: m.createdAt,
        user: {
          id: other.id,
          firstName: other.firstName,
          age: other.profile?.age,
          city: other.profile?.city,
          photo: other.photos[0]?.url || null,
        },
        lastMessage: m.messages[0] || null,
      };
    });

    res.json({ matches: formatted });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.userAId !== req.dbUser.id && match.userBId !== req.dbUser.id) return res.status(403).json({ error: 'Forbidden' });
    await prisma.match.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
