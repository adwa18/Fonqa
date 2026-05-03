// src/services/contentFilter.js
// In-chat content filter: blocks links, phone numbers, explicit content

const BLOCK_PATTERNS = [
  /https?:\/\//i,                          // external links
  /t\.me\/[a-zA-Z0-9_]/,                  // telegram links
  /(\+?[\d\s\-\(\)]{10,15})/,             // phone numbers
  /@[a-zA-Z0-9_]{4,}/,                    // @usernames
  /\b(whatsapp|telegram|instagram|snapchat|facebook)\b/i,  // social platforms
  // Amharic slurs / explicit terms can be added here
];

const EXPLICIT_WORDS = [
  // add culturally specific explicit terms
  'explicit1', 'explicit2',
];

function filterMessage(content) {
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'External links and contact sharing are not allowed in early conversations.' };
    }
  }

  const lower = content.toLowerCase();
  for (const word of EXPLICIT_WORDS) {
    if (lower.includes(word)) {
      return { blocked: true, reason: 'Message contains inappropriate content.' };
    }
  }

  return { blocked: false };
}

// Check message count in match — apply filter only for first N messages
const FILTER_FOR_FIRST_N_MESSAGES = 10;

async function shouldFilter(prisma, matchId, senderId) {
  const count = await prisma.message.count({ where: { matchId } });
  return count < FILTER_FOR_FIRST_N_MESSAGES;
}

module.exports = { filterMessage, shouldFilter };
