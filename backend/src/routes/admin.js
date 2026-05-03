// src/routes/admin.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const notify = require('../services/notifications');

router.use(authenticate, requireAdmin);

// ── Analytics
router.get('/stats', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const [
      totalUsers, activeUsers, totalMatches,
      pendingReports, pendingPayments, pendingVerifications,
      premiumUsers, newUsersToday,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { lastSeen: { gte: new Date(Date.now() - 7*86400000) }, isActive: true } }),
      prisma.match.count({ where: { isActive: true } }),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.paymentRequest.count({ where: { status: 'pending' } }),
      prisma.verification.count({ where: { status: 'pending' } }),
      prisma.subscription.count({ where: { tier: 'premium', premiumEnds: { gt: new Date() } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    ]);
    res.json({ totalUsers, activeUsers, totalMatches, pendingReports, pendingPayments, pendingVerifications, premiumUsers, newUsersToday });
  } catch (err) { next(err); }
});

// ── Users
router.get('/users', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const page = parseInt(req.query.page) || 1;
    const perPage = 25;
    const search = req.query.search || '';
    const where = search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { telegramId: { contains: search } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: { select: { age: true, gender: true, city: true, isVerified: true } },
          subscription: { select: { tier: true, premiumEnds: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page-1)*perPage,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page, pages: Math.ceil(total/perPage) });
  } catch (err) { next(err); }
});

router.post('/users/:id/ban', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: true, banReason: req.body.reason || 'ToS violation', isActive: false } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/users/:id/unban', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: false, banReason: null, isActive: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Reports
router.get('/reports', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const status = req.query.status || 'pending';
    const page = parseInt(req.query.page) || 1;
    const reports = await prisma.report.findMany({
      where: { status },
      include: {
        reporter: { select: { id: true, firstName: true, telegramId: true } },
        reported: { select: { id: true, firstName: true, telegramId: true, isBanned: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page-1)*20, take: 20,
    });
    const total = await prisma.report.count({ where: { status } });
    res.json({ reports, total, page, pages: Math.ceil(total/20) });
  } catch (err) { next(err); }
});

router.patch('/reports/:id', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, reviewNote } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, reviewNote, reviewedAt: new Date() },
    });
    res.json({ report });
  } catch (err) { next(err); }
});

// ── Payment approvals
router.get('/payments', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const status = req.query.status || 'pending';
    const payments = await prisma.paymentRequest.findMany({
      where: { status },
      include: { user: { select: { id: true, firstName: true, telegramId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ payments });
  } catch (err) { next(err); }
});

router.post('/payments/:id/approve', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const payment = await prisma.paymentRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: String(req.telegramUser.id),
        adminNote: req.body.note || null,
      },
      include: { user: true },
    });

    const premiumEnds = new Date(Date.now() + payment.durationDays * 86400000);
    await prisma.subscription.upsert({
      where: { userId: payment.userId },
      update: { tier: 'premium', premiumStarts: new Date(), premiumEnds },
      create: { userId: payment.userId, tier: 'premium', premiumStarts: new Date(), premiumEnds },
    });
    await prisma.user.update({ where: { id: payment.userId }, data: { updatedAt: new Date() } });

    notify.notifyPremiumActivated(payment.user.telegramId, premiumEnds).catch(() => {});
    res.json({ success: true, premiumEnds });
  } catch (err) { next(err); }
});

router.post('/payments/:id/reject', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.paymentRequest.update({
      where: { id: req.params.id },
      data: { status: 'rejected', adminNote: req.body.reason, reviewedAt: new Date(), reviewedBy: String(req.telegramUser.id) },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Verifications
router.get('/verifications', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const verifications = await prisma.verification.findMany({
      where: { status: 'pending' },
      include: { user: { select: { id: true, firstName: true, telegramId: true, photos: { where: { isMain: true }, take: 1 } } } },
      orderBy: { triggeredAt: 'asc' },
    });
    res.json({ verifications });
  } catch (err) { next(err); }
});

router.post('/verifications/:id/approve', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const v = await prisma.verification.update({
      where: { id: req.params.id },
      data: { status: 'approved', reviewedAt: new Date(), reviewedBy: String(req.telegramUser.id) },
      include: { user: true },
    });
    await prisma.profile.update({ where: { userId: v.userId }, data: { isVerified: true } });
    notify.notifyVerificationApproved(v.user.telegramId).catch(() => {});
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/verifications/:id/reject', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const v = await prisma.verification.update({
      where: { id: req.params.id },
      data: { status: 'rejected', adminNote: req.body.reason, reviewedAt: new Date(), reviewedBy: String(req.telegramUser.id) },
      include: { user: true },
    });
    await prisma.verification.update({ where: { id: req.params.id }, data: { status: 'none' } }); // allow retry
    notify.notifyVerificationRejected(v.user.telegramId, req.body.reason).catch(() => {});
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
