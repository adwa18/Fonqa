// src/routes/uploads.js — Fonqa v3 (merged)
const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer — validate before hitting Cloudinary
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error('UNSUPPORTED_FORMAT'), { code: 'UNSUPPORTED_FORMAT' }));
  },
});

// Wrap multer so we can return clean JSON errors
function uploadMiddleware(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File too large. Maximum allowed size is ${MAX_SIZE_MB} MB.`,
        code: 'FILE_TOO_LARGE',
      });
    }
    if (err.code === 'UNSUPPORTED_FORMAT') {
      return res.status(400).json({
        error: 'Unsupported format. Please upload a JPG, PNG, or WebP image.',
        code: 'UNSUPPORTED_FORMAT',
      });
    }
    next(err);
  });
}

// POST /api/uploads/photo — multer FIRST, then authenticate
router.post('/photo', uploadMiddleware, authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const userId = req.dbUser.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.', code: 'NO_FILE' });
    }

    const existingCount = await prisma.photo.count({ where: { userId, isSelfie: false } });
    if (existingCount >= 6) {
      return res.status(400).json({ error: 'Maximum 6 photos allowed.', code: 'MAX_PHOTOS' });
    }

    // Upload to Cloudinary with auto moderation tags
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `fonqa/photos/${userId}`,
          transformation: [
            { width: 800, height: 1000, crop: 'fill', gravity: 'face', quality: 'auto' },
            { fetch_format: 'auto' },
          ],
          // Cloudinary AI moderation (provider-specific tag; adjust to your account/add-ons)
          moderation: 'aws_rek',
          detection: 'adv_face',
        },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(req.file.buffer);
    });

    // ── Parse moderation results
    const moderation = result.moderation?.[0];
    const faceData = result.info?.detection?.adv_face?.predictions?.[0];

    let flagReason = null;
    let moderationData = {};

    // Check NSFW / violence (Rekognition style)
    if (moderation?.status === 'rejected') {
      const labels = moderation.response?.moderation_labels || [];
      const hasNSFW = labels.some(l => ['Explicit Nudity', 'Nudity', 'Suggestive'].includes(l.name));
      const hasViolence = labels.some(l => ['Violence', 'Graphic Violence'].includes(l.name));
      flagReason = hasNSFW ? 'nsfw' : hasViolence ? 'violence' : 'moderation';
      moderationData = { labels, status: moderation.status };

      await cloudinary.uploader.destroy(result.public_id).catch(() => { });

      const msg = hasNSFW
        ? 'Photo rejected: contains explicit or adult content.'
        : 'Photo rejected: contains violent content.';
      return res.status(400).json({ error: msg, code: flagReason.toUpperCase() });
    }

    // Check face detection — profile photos must contain a face
    const hasFace = faceData?.attributes?.real_face?.value === 'true' || !!faceData;
    const faceScore = faceData?.attributes?.real_face?.confidence || 0;
    moderationData = { ...moderationData, hasFace, faceScore };

    if (!hasFace) {
      await cloudinary.uploader.destroy(result.public_id).catch(() => { });
      return res.status(400).json({
        error: 'No face detected. Please upload a clear photo of your face.',
        code: 'NO_FACE',
      });
    }

    // Duplicate detection — compare phash with existing photos
    const existing = await prisma.photo.findMany({
      where: { userId, isSelfie: false },
      select: { publicId: true },
    });

    if (existing.length > 0 && result.phash) {
      const dupCheck = await Promise.all(
        existing.map(p =>
          cloudinary.api.resource(p.publicId, { phash: true })
            .then(r => ({ publicId: p.publicId, phash: r.phash }))
            .catch(() => null)
        )
      );
      const isDuplicate = dupCheck.filter(Boolean).some(p => {
        if (!p.phash || !result.phash) return false;
        // Hamming distance threshold (lower = more similar; <10 = near-duplicate)
        const dist = hammingDistance(p.phash, result.phash);
        return dist < 10;
      });

      if (isDuplicate) {
        await cloudinary.uploader.destroy(result.public_id).catch(() => { });
        return res.status(400).json({
          error: 'This photo appears to be a duplicate of one you already uploaded.',
          code: 'DUPLICATE_PHOTO',
        });
      }
    }

    const isFirst = existingCount === 0;
    const photo = await prisma.photo.create({
      data: {
        userId,
        url: result.secure_url,
        publicId: result.public_id,
        order: existingCount,
        isMain: isFirst,
        isSelfie: false,
        isApproved: true,
        isFlagged: false,
        moderationData,
      },
    });

    res.json({ photo });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/uploads/photo/:photoId
router.delete('/photo/:photoId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });

    if (!photo || photo.userId !== req.dbUser.id) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    await cloudinary.uploader.destroy(photo.publicId).catch(() => { });
    await prisma.photo.delete({ where: { id: photo.id } });

    // Promote next photo to main if deleted was main
    if (photo.isMain) {
      const next = await prisma.photo.findFirst({
        where: { userId: req.dbUser.id, isSelfie: false },
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
      data: { isMain: false },
    });
    await prisma.photo.update({
      where: { id: req.params.photoId },
      data: { isMain: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Hamming distance between two hex phash strings
function hammingDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 999;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += xor.toString(2).split('').filter(c => c === '1').length;
  }
  return dist;
}

module.exports = router;
