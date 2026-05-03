// src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
module.exports = rateLimit({
  windowMs: 60000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.dbUser?.id || req.ip,
  message: { error: 'Too many requests' },
});
