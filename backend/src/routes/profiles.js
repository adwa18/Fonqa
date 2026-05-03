// src/routes/profiles.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const profileValidation = [
  body('age').isInt({ min: 18, max: 99 }),
  body('gender').isIn(['male', 'female']),
  body('bio').optional().isLength({ max: 600 }),
  body('lookingFor').isIn(['marriage', 'relationship', 'casual', 'friendship', 'all']),
  body('kidsStatus').optional().isIn(['none','have_kids','want_kids','dont_want_kids','open']),
  body('education').optional().isIn(['high_school','some_college','bachelors','masters','phd','trade_school','other']),
  body('religion').optional().isIn(['christian','muslim','jewish','hindu','buddhist','orthodox','catholic','protestant','other','none']),
];

router.post('/', authenticate, profileValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const prisma = req.app.get('prisma');
    const userId = req.dbUser.id;
    const {
      age, gender, bio, occupation, education, religion,
      kidsStatus, kidsCount, height, lookingFor,
      latitude, longitude, city, country, locationLabel, interests, visibility,
    } = req.body;

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        age: parseInt(age), gender, bio: bio || null,
        occupation: occupation || null,
        education: education || null,
        religion: religion || null,
        kidsStatus: kidsStatus || 'none',
        kidsCount: kidsCount ? parseInt(kidsCount) : null,
        height: height ? parseInt(height) : null,
        lookingFor: lookingFor || 'all',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        city: city || null, country: country || null,
        locationLabel: locationLabel || null,
        interests: Array.isArray(interests) ? interests : [],
        visibility: visibility || 'public',
        profileComplete: true,
        updatedAt: new Date(),
      },
      create: {
        userId, age: parseInt(age), gender, bio: bio || null,
        occupation: occupation || null,
        education: education || null,
        religion: religion || null,
        kidsStatus: kidsStatus || 'none',
        kidsCount: kidsCount ? parseInt(kidsCount) : null,
        height: height ? parseInt(height) : null,
        lookingFor: lookingFor || 'all',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        city: city || null, country: country || null,
        locationLabel: locationLabel || null,
        interests: Array.isArray(interests) ? interests : [],
        visibility: visibility || 'public',
        profileComplete: true,
      },
    });

    await prisma.preference.upsert({ where: { userId }, update: {}, create: { userId } });
    res.json({ profile });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const [profile, photos, preferences, subscription, verification] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: req.dbUser.id } }),
      prisma.photo.findMany({ where: { userId: req.dbUser.id, isSelfie: false }, orderBy: { order: 'asc' } }),
      prisma.preference.findUnique({ where: { userId: req.dbUser.id } }),
      prisma.subscription.findUnique({ where: { userId: req.dbUser.id } }),
      prisma.verification.findUnique({ where: { userId: req.dbUser.id } }),
    ]);
    res.json({ user: req.dbUser, profile, photos, preferences, subscription, verification });
  } catch (err) { next(err); }
});

// View another user's profile — log profile view
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const notify = require('../services/notifications');
    const targetId = req.params.id;
    const myId = req.dbUser.id;

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        profile: true,
        photos: { where: { isSelfie: false }, orderBy: { order: 'asc' } },
      },
    });

    if (!target) return res.status(404).json({ error: 'User not found' });

    // Respect visibility
    if (target.profile?.visibility === 'matches_only') {
      const [uA, uB] = myId < targetId ? [myId, targetId] : [targetId, myId];
      const match = await prisma.match.findUnique({ where: { userAId_userBId: { userAId: uA, userBId: uB } } });
      if (!match) return res.status(403).json({ error: 'This profile is private' });
    }

    // Log view (debounced — only once per hour per viewer)
    const recentView = await prisma.profileView.findFirst({
      where: {
        viewerId: myId,
        viewedId: targetId,
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });
    if (!recentView) {
      await prisma.profileView.create({ data: { viewerId: myId, viewedId: targetId } });
      // Notify target
      notify.notifyProfileVisit(target.telegramId, req.dbUser.firstName).catch(() => {});
    }

    res.json({
      id: target.id,
      firstName: target.firstName,
      profile: target.profile,
      photos: target.photos,
    });
  } catch (err) { next(err); }
});

router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { ageMin, ageMax, genderPreference, maxDistance, lookingFor, religionPreference, educationPreference } = req.body;
    const prefs = await prisma.preference.upsert({
      where: { userId: req.dbUser.id },
      update: {
        ...(ageMin !== undefined && { ageMin: parseInt(ageMin) }),
        ...(ageMax !== undefined && { ageMax: parseInt(ageMax) }),
        ...(genderPreference && { genderPreference }),
        ...(maxDistance !== undefined && { maxDistance: maxDistance === null ? null : parseInt(maxDistance) }),
        ...(lookingFor && { lookingFor }),
        ...(religionPreference !== undefined && { religionPreference }),
        ...(educationPreference !== undefined && { educationPreference }),
        updatedAt: new Date(),
      },
      create: { userId: req.dbUser.id },
    });
    res.json({ preferences: prefs });
  } catch (err) { next(err); }
});

// DELETE /api/profiles/me — delete account
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.user.update({
      where: { id: req.dbUser.id },
      data: { isActive: false, firstName: '[deleted]', username: null, photoUrl: null },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
