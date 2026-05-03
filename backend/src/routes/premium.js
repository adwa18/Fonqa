// src/routes/premium.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/premium/status
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const sub = await prisma.subscription.findUnique({ where: { userId: req.dbUser.id } });
    const { profile } = req.dbUser;

    const isFemale = profile?.gender === 'female';
    const now = new Date();

    const isPremium = sub?.tier === 'premium' && sub.premiumEnds && now < new Date(sub.premiumEnds);
    const isInTrial = sub?.trialEnds && now < new Date(sub.trialEnds);
    const canChat = isFemale || isPremium || isInTrial;

    const pendingRequest = await prisma.paymentRequest.findFirst({
      where: { userId: req.dbUser.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      canChat,
      isFemale,
      isPremium,
      isInTrial,
      trialEnds: sub?.trialEnds || null,
      premiumEnds: sub?.premiumEnds || null,
      pendingRequest: pendingRequest ? { id: pendingRequest.id, createdAt: pendingRequest.createdAt } : null,
      paymentInfo: {
        amount: 200,
        currency: 'ETB',
        methods: [
          { id: 'cbe_birr', label: 'CBE Birr', account: process.env.CBE_ACCOUNT || '1000xxxxxxxx', name: 'Fonqa Ethiopia' },
          { id: 'telebirr', label: 'TeleBirr', account: process.env.TELEBIRR_ACCOUNT || '09xxxxxxxx', name: 'Fonqa Ethiopia' },
          { id: 'bank_transfer', label: 'Bank Transfer (CBE)', account: process.env.BANK_ACCOUNT || '1000xxxxxxxx', name: 'Fonqa Ethiopia' },
        ],
      },
    });
  } catch (err) { next(err); }
});

// POST /api/premium/request — submit payment proof
router.post('/request', authenticate, upload.single('screenshot'), async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { method, reference } = req.body;

    if (!method) return res.status(400).json({ error: 'Payment method required' });

    let screenshotUrl = null;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `fonqa/payments/${req.dbUser.id}`, resource_type: 'image' },
          (err, res) => err ? reject(err) : resolve(res)
        );
        stream.end(req.file.buffer);
      });
      screenshotUrl = result.secure_url;
    }

    // Cancel any existing pending request
    await prisma.paymentRequest.updateMany({
      where: { userId: req.dbUser.id, status: 'pending' },
      data: { status: 'rejected', adminNote: 'Superseded by new request' },
    });

    const request = await prisma.paymentRequest.create({
      data: {
        userId: req.dbUser.id,
        method,
        reference: reference || null,
        screenshotUrl,
        status: 'pending',
        amount: 200,
        durationDays: 30,
      },
    });

    res.json({ request: { id: request.id, status: request.status } });
  } catch (err) { next(err); }
});

module.exports = router;
