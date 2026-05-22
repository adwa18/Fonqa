// src/services/matching.js — Fonqa v3
// (F) Gender-based discovery: males see females only, females see males only
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const prisma = require('../lib/prisma');

const CANDIDATE_POOL = 80;
const SERVE_BATCH    = 12;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function interestScore(a, b) {
  if (!a?.length || !b?.length) return 0;
  const sa = new Set(a.map(s => s.toLowerCase()));
  const sb = new Set(b.map(s => s.toLowerCase()));
  const inter = [...sa].filter(x => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union ? inter / union : 0;
}

function completenessScore(profile, photos) {
  let s = 0;
  if (profile?.bio?.length > 20)       s += 0.25;
  if (photos?.length >= 2)             s += 0.25;
  if (profile?.interests?.length >= 3) s += 0.2;
  if (profile?.occupation)             s += 0.1;
  if (profile?.city)                   s += 0.1;
  if (profile?.religion)               s += 0.05;
  if (profile?.education)              s += 0.05;
  return s;
}

function activityScore(lastSeen) {
  const d = (Date.now() - new Date(lastSeen).getTime()) / 86400000;
  if (d < 1)  return 1.0;
  if (d < 3)  return 0.8;
  if (d < 7)  return 0.5;
  if (d < 30) return 0.2;
  return 0.0;
}

// (F) Determine which gender to show based on user's own gender
function oppositeGender(gender) {
  return gender === 'male' ? 'female' : 'male';
}

async function getCandidates(userId) {
  const [me, prefs, myProfile, myPhotos] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    prisma.preference.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.photo.findMany({ where: { userId } }),
  ]);

  if (!me || !myProfile || !prefs) throw new Error('Profile or preferences incomplete');

  // (F) Always show opposite gender regardless of preference setting
  const targetGender = oppositeGender(myProfile.gender);

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const excludeIds = new Set([
    userId,
    ...blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId),
  ]);

  const locationFilter = (prefs.maxDistance && myProfile.latitude)
    ? {
        latitude:  { gte: myProfile.latitude  - prefs.maxDistance / 90, lte: myProfile.latitude  + prefs.maxDistance / 90 },
        longitude: { gte: myProfile.longitude - prefs.maxDistance / 90, lte: myProfile.longitude + prefs.maxDistance / 90 },
      }
    : {};

  const candidates = await prisma.user.findMany({
    where: {
      id:           { notIn: [...excludeIds] },
      isActive:     true,
      isBanned:     false,
      isDeactivated: false,           // (I) exclude deactivated
      profile: {
        profileComplete: true,
        visibility:      { in: ['public'] },
        gender:          targetGender, // (F) always opposite gender
        age:             { gte: prefs.ageMin, lte: prefs.ageMax },
        ...(prefs.religionPreference ? { religion: prefs.religionPreference } : {}),
        ...locationFilter,
      },
    },
    include: {
      profile: true,
      photos:  { where: { isSelfie: false, isApproved: true }, orderBy: { order: 'asc' }, take: 4 },
      boosts:  { where: { expiresAt: { gt: new Date() } }, take: 1 },
    },
    take: CANDIDATE_POOL,
    orderBy: { lastSeen: 'desc' },
  });

  const scored = candidates.map(c => {
    const dist = (myProfile.latitude && c.profile?.latitude)
      ? haversineKm(myProfile.latitude, myProfile.longitude, c.profile.latitude, c.profile.longitude)
      : null;

    if (dist !== null && prefs.maxDistance && dist > prefs.maxDistance * 1.1) return null;

    const iScore = interestScore(myProfile.interests, c.profile?.interests);
    const cScore = completenessScore(c.profile, c.photos);
    const aScore = activityScore(c.lastSeen);
    const dScore = dist !== null && prefs.maxDistance
      ? Math.max(0, 1 - dist / (prefs.maxDistance * 1.5))
      : 0.4;
    const boosted  = c.boosts.length > 0 ? 0.25 : 0;
    const verified = c.profile?.isVerified ? 0.1 : 0;

    const total = iScore * 0.3 + dScore * 0.15 + cScore * 0.25 + aScore * 0.15
      + boosted + verified + Math.random() * 0.15;

    return { user: c, score: total, distanceKm: dist ? Math.round(dist) : null };
  }).filter(Boolean);

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, SERVE_BATCH).map(({ user: u, distanceKm }) => ({
    id:          u.id,
    firstName:   u.firstName,
    age:         u.profile?.age,
    gender:      u.profile?.gender,
    city:        u.profile?.city,
    country:     u.profile?.country,
    locationLabel: u.profile?.locationLabel,
    bio:         u.profile?.bio,
    occupation:  u.profile?.occupation,
    education:   u.profile?.education,
    religion:    u.profile?.religion,
    kidsStatus:  u.profile?.kidsStatus,
    lookingFor:  u.profile?.lookingFor,
    interests:   u.profile?.interests || [],
    photos:      u.photos.map(p => p.url),
    distanceKm,
    isVerified:  u.profile?.isVerified || false,
    isBoosted:   u.boosts.length > 0,
    isDeactivated: false,
  }));
}

// (H) "Liked me" — keep entries visible even after match, show status
async function getWhoLikedMe(userId) {
  // Get my own gender to find opposite-gender likers only (F)
  const me = await prisma.profile.findUnique({ where: { userId }, select: { gender: true } });
  const targetGender = me ? oppositeGender(me.gender) : undefined;

  const likes = await prisma.swipe.findMany({
    where: {
      receiverId: userId,
      direction:  { in: ['like', 'superlike'] },
      sender: {
        isBanned:     false,
        isDeactivated: false,
        ...(targetGender ? { profile: { gender: targetGender } } : {}),
      },
    },
    include: {
      sender: {
        include: {
          profile: { select: { age: true, city: true, gender: true, isVerified: true } },
          photos:  { where: { isMain: true, isApproved: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['senderId'],   // latest swipe per sender only
    take: 100,
  });

  // For each liker, determine status
  const myId = userId;
  return Promise.all(likes.map(async s => {
    const sid = s.sender.id;
    const [uA, uB] = myId < sid ? [myId, sid] : [sid, myId];
    const match = await prisma.match.findUnique({
      where: { userAId_userBId: { userAId: uA, userBId: uB } },
    });

    // Did I already swipe them?
    const mySwipe = await prisma.swipe.findFirst({
      where: { senderId: myId, receiverId: sid, direction: { in: ['like', 'superlike'] } },
    });

    let status = 'liked_you';
    if (match?.isActive)  status = 'matched';
    else if (mySwipe)     status = 'you_liked';

    return {
      userId:    sid,
      firstName: s.sender.firstName,
      age:       s.sender.profile?.age,
      city:      s.sender.profile?.city,
      photo:     s.sender.photos[0]?.url || null,
      direction: s.direction,
      likedAt:   s.createdAt,
      isVerified: s.sender.profile?.isVerified || false,
      status,   // "liked_you" | "matched" | "you_liked"
      matchId:  match?.id || null,
    };
  }));
}

// (H) Check if user already liked someone — prevent silent duplicates
async function getLatestSwipe(senderId, receiverId) {
  return prisma.swipe.findFirst({
    where:   { senderId, receiverId },
    orderBy: { createdAt: 'desc' },
  });
}

async function recordSwipe(senderId, receiverId, direction) {
  // (H) Check for duplicate like
  if (direction === 'like' || direction === 'superlike') {
    const existing = await getLatestSwipe(senderId, receiverId);
    if (existing && (existing.direction === 'like' || existing.direction === 'superlike')) {
      return { isMatch: false, alreadyLiked: true };
    }
  }

  await prisma.swipe.create({ data: { senderId, receiverId, direction } });

  if (direction === 'pass') return { isMatch: false };

  const mutual = await prisma.swipe.findFirst({
    where: {
      senderId:  receiverId,
      receiverId: senderId,
      direction: { in: ['like', 'superlike'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!mutual) return { isMatch: false };

  const [userAId, userBId] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

  const match = await prisma.match.upsert({
    where:  { userAId_userBId: { userAId, userBId } },
    update: { isActive: true },
    create: { userAId, userBId },
    include: {
      userA: { include: { photos: { where: { isMain: true }, take: 1 } } },
      userB: { include: { photos: { where: { isMain: true }, take: 1 } } },
    },
  });

  // Trigger verification after 5 matches
  const matchCount = await prisma.match.count({
    where: { OR: [{ userAId: senderId }, { userBId: senderId }] },
  });
  if (matchCount >= 5) {
    const existing = await prisma.verification.findUnique({ where: { userId: senderId } });
    if (!existing) {
      const gestures = ['Peace sign ✌️', 'Thumbs up 👍', 'Open hand 🖐️', 'Point up ☝️', 'Wave 👋'];
      await prisma.verification.create({
        data: { userId: senderId, gesture: gestures[Math.floor(Math.random() * gestures.length)], status: 'none' },
      });
    }
  }

  return { isMatch: true, matchId: match.id, match };
}

module.exports = { getCandidates, recordSwipe, getWhoLikedMe, getLatestSwipe, oppositeGender };
