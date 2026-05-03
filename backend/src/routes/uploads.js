// src/routes/uploads.js
const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../middleware/auth');
const { moderateImage } = require('../services/vision');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only')),
});

router.post('/photo', authenticate, upload.single('photo'), async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const userId = req.dbUser.id;
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const existingCount = await prisma.photo.count({ where: { userId, isSelfie: false } });
    if (existingCount >= 6) return res.status(400).json({ error: 'Maximum 6 photos allowed' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `fonqa/${userId}`, transformation: [{ width: 800, height: 1000, crop: 'fill', gravity: 'face', quality: 'auto' }, { fetch_format: 'auto' }] },
        (err, r) => err ? reject(err) : resolve(r)
      );
      stream.end(req.file.buffer);
    });

    // NSFW moderation
    const modResult = await moderateImage(result.secure_url);
    if (!modResult.safe) {
      await cloudinary.uploader.destroy(result.public_id);
      return res.status(400).json({ error: 'Photo failed content moderation. Please use an appropriate image.' });
    }

    const isFirst = existingCount === 0;
    const photo = await prisma.photo.create({
      data: { userId, url: result.secure_url, publicId: result.public_id, order: existingCount, isMain: isFirst },
    });

    res.json({ photo });
  } catch (err) { next(err); }
});

router.delete('/photo/:photoId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
    if (!photo || photo.userId !== req.dbUser.id) return res.status(404).json({ error: 'Not found' });
    await cloudinary.uploader.destroy(photo.publicId);
    await prisma.photo.delete({ where: { id: photo.id } });
    if (photo.isMain) {
      const next = await prisma.photo.findFirst({ where: { userId: req.dbUser.id, isSelfie: false }, orderBy: { order: 'asc' } });
      if (next) await prisma.photo.update({ where: { id: next.id }, data: { isMain: true } });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/photo/:photoId/main', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.photo.updateMany({ where: { userId: req.dbUser.id }, data: { isMain: false } });
    await prisma.photo.update({ where: { id: req.params.photoId }, data: { isMain: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
