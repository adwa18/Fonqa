// src/services/vision.js
// Google Cloud Vision API — NSFW detection + face verification
// Free tier: 1000 units/month per feature

const logger = require('../utils/logger');

let visionClient = null;

function getClient() {
  if (!visionClient) {
    const vision = require('@google-cloud/vision');
    // Uses GOOGLE_APPLICATION_CREDENTIALS env var or API key
    visionClient = new vision.ImageAnnotatorClient(
      process.env.GOOGLE_VISION_API_KEY
        ? { apiKey: process.env.GOOGLE_VISION_API_KEY }
        : {}
    );
  }
  return visionClient;
}

/**
 * Check an image URL for NSFW / violence.
 * Returns: { safe: bool, reason?: string, scores: object }
 */
async function moderateImage(imageUrl) {
  if (!process.env.GOOGLE_VISION_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger.warn('Vision API not configured — skipping moderation');
    return { safe: true, scores: {} };
  }

  try {
    const client = getClient();
    const [result] = await client.safeSearchDetection(imageUrl);
    const safe = result.safeSearchAnnotation;

    const BLOCKED = ['LIKELY', 'VERY_LIKELY'];

    if (BLOCKED.includes(safe.adult) || BLOCKED.includes(safe.violence) || BLOCKED.includes(safe.racy)) {
      return {
        safe: false,
        reason: 'Image flagged by AI moderation',
        scores: {
          adult: safe.adult,
          violence: safe.violence,
          racy: safe.racy,
        },
      };
    }

    return {
      safe: true,
      scores: { adult: safe.adult, violence: safe.violence, racy: safe.racy },
    };
  } catch (err) {
    logger.error(`Vision moderation error: ${err.message}`);
    // Fail open — don't block uploads if Vision API is down
    return { safe: true, scores: {}, error: err.message };
  }
}

/**
 * Detect faces in a selfie. Returns confidence score (0-1).
 */
async function detectFace(imageUrl) {
  if (!process.env.GOOGLE_VISION_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { hasFace: true, score: 1.0 };
  }

  try {
    const client = getClient();
    const [result] = await client.faceDetection(imageUrl);
    const faces = result.faceAnnotations || [];

    if (faces.length === 0) return { hasFace: false, score: 0 };

    const best = faces[0];
    const score = best.detectionConfidence || 0;
    return { hasFace: true, score, rollAngle: best.rollAngle, panAngle: best.panAngle };
  } catch (err) {
    logger.error(`Vision face detection error: ${err.message}`);
    return { hasFace: true, score: 0.5, error: err.message };
  }
}

module.exports = { moderateImage, detectFace };
