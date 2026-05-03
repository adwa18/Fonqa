// src/routes/reports.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { reportedId, reason, details } = req.body;
    const validReasons = ['spam','fake','inappropriate','harassment','other'];
    if (!reportedId || !validReasons.includes(reason)) return res.status(400).json({ error: 'Invalid report data' });

    const report = await prisma.report.create({
      data: { reporterId: req.dbUser.id, reportedId, reason, details: details?.slice(0,500) || null },
    });
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.dbUser.id, blockedId: reportedId } },
      update: {},
      create: { blockerId: req.dbUser.id, blockedId: reportedId },
    });
    res.json({ report: { id: report.id } });
  } catch (err) { next(err); }
});

router.post('/block/:userId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.dbUser.id, blockedId: req.params.userId } },
      update: {},
      create: { blockerId: req.dbUser.id, blockedId: req.params.userId },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
