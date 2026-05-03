// src/routes/verify.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { detectFace, moderateImage } = require('../services/vision');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/verify/status — check if verification needed/pending
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const verification = await prisma.verification.findUnique({ where: { userId: req.dbUser.id } });

    if (!verification) return res.json({ required: false });

    res.json({
      required: verification.status === 'none',
      status: verification.status,
      gesture: verification.gesture,
    });
  } catch (err) { next(err); }
});

// POST /api/verify/selfie — upload selfie for review
router.post('/selfie', authenticate, upload.single('selfie'), async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');

    const verification = await prisma.verification.findUnique({ where: { userId: req.dbUser.id } });
    if (!verification) return res.status(400).json({ error: 'Verification not required' });

    if (!req.file) return res.status(400).json({ error: 'No selfie provided' });

    // Upload to Cloudinary (private folder)
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `fonqa/selfies/${req.dbUser.id}`, resource_type: 'image', type: 'authenticated' },
        (err, r) => err ? reject(err) : resolve(r)
      );
      stream.end(req.file.buffer);
    });

    // Run NSFW + face detection
    const [modResult, faceResult] = await Promise.all([
      moderateImage(result.secure_url),
      detectFace(result.secure_url),
    ]);

    if (!modResult.safe) {
      await cloudinary.uploader.destroy(result.public_id);
      return res.status(400).json({ error: 'Photo failed content moderation. Please use a clear face selfie.' });
    }

    await prisma.verification.update({
      where: { userId: req.dbUser.id },
      data: {
        selfieUrl: result.secure_url,
        selfiePublicId: result.public_id,
        status: 'pending',
        aiScore: faceResult.score,
      },
    });

    res.json({
      status: 'pending',
      message: 'Selfie submitted. Our team will review it within 24 hours.',
      faceDetected: faceResult.hasFace,
    });
  } catch (err) { next(err); }
});

module.exports = router;
