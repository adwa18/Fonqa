// src/routes/uploads.js
const router   = require('express').Router();
const multer   = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../middleware/auth');
const { moderateImage } = require('../services/vision');

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

// ── IMPORTANT: multer FIRST, then authenticate.
// For multipart/form-data Express needs the body fully parsed before
// any middleware tries to access req.body or headers derived from it.
// The x-telegram-init-data header is not in the body so it is available
// either way — but placing multer first avoids any stream-read conflicts
// that can occur when two middleware both touch the raw request stream.

// POST /api/uploads/photo
router.post(
  '/photo',
  upload.single('photo'),   // ← parses multipart first
  authenticate,             // ← then verify Telegram identity
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const userId = req.dbUser.id;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const existingCount = await prisma.photo.count({
        where: { userId, isSelfie: false },
      });
      if (existingCount >= 6) {
        return res.status(400).json({ error: 'Maximum 6 photos allowed' });
      }

      // Upload to Cloudinary with face-aware crop
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `fonqa/${userId}`,
            transformation: [
              { width: 800, height: 1000, crop: 'fill', gravity: 'face', quality: 'auto' },
              { fetch_format: 'auto' },
            ],
          },
          (err, r) => (err ? reject(err) : resolve(r))
        );
        stream.end(req.file.buffer);
      });

      // NSFW moderation (non-blocking — don't fail upload if Vision is down)
      const modResult = await moderateImage(result.secure_url).catch(() => ({ safe: true }));
      if (!modResult.safe) {
        await cloudinary.uploader.destroy(result.public_id).catch(() => {});
        return res.status(400).json({
          error: 'Photo failed content moderation. Please use an appropriate image.',
        });
      }

      const isFirst = existingCount === 0;
      const photo = await prisma.photo.create({
        data: {
          userId,
          url:      result.secure_url,
          publicId: result.public_id,
          order:    existingCount,
          isMain:   isFirst,
          isSelfie: false,
        },
      });

      res.json({ photo });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/uploads/photo/:photoId
router.delete('/photo/:photoId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const photo  = await prisma.photo.findUnique({ where: { id: req.params.photoId } });

    if (!photo || photo.userId !== req.dbUser.id) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    await cloudinary.uploader.destroy(photo.publicId).catch(() => {});
    await prisma.photo.delete({ where: { id: photo.id } });

    // Promote next photo to main if deleted was main
    if (photo.isMain) {
      const next = await prisma.photo.findFirst({
        where:   { userId: req.dbUser.id, isSelfie: false },
        orderBy: { order: 'asc' },
      });
      if (next) {
        await prisma.photo.update({ where: { id: next.id }, data: { isMain: true } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/uploads/photo/:photoId/main
router.patch('/photo/:photoId/main', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.photo.updateMany({
      where: { userId: req.dbUser.id },
      data:  { isMain: false },
    });
    await prisma.photo.update({
      where: { id: req.params.photoId },
      data:  { isMain: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
