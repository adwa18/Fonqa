// src/services/notifications.js
const logger = require('../utils/logger');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text, options = {}) {
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options,
      }),
    });
    const data = await res.json();
    if (!data.ok) logger.warn(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
    return data;
  } catch (err) {
    logger.error(`Notification error: ${err.message}`);
  }
}

const APP_URL = process.env.WEBAPP_URL || '';

async function notifyMatch(telegramId, matchedWith) {
  return sendMessage(
    telegramId,
    `💕 <b>It's a Match!</b>\n\nYou and <b>${matchedWith}</b> liked each other on Fonqa!\n\n<a href="${APP_URL}">Open Fonqa to say hello →</a>`,
  );
}

async function notifyLike(telegramId, fromName) {
  return sendMessage(
    telegramId,
    `❤️ <b>${fromName}</b> liked your profile on Fonqa!\n\n<a href="${APP_URL}">Open Fonqa to see →</a>`,
  );
}

async function notifyMessage(telegramId, fromName) {
  return sendMessage(
    telegramId,
    `💬 <b>${fromName}</b> sent you a message on Fonqa!\n\n<a href="${APP_URL}">Open Fonqa to reply →</a>`,
  );
}

async function notifyProfileVisit(telegramId, visitorName) {
  return sendMessage(
    telegramId,
    `👀 <b>${visitorName}</b> visited your Fonqa profile.\n\n<a href="${APP_URL}">Open Fonqa →</a>`,
  );
}

async function notifyPremiumActivated(telegramId, endsAt) {
  const date = new Date(endsAt).toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' });
  return sendMessage(
    telegramId,
    `⭐ <b>Your Fonqa Premium is now active!</b>\n\nEnjoy unlimited chat until <b>${date}</b>.\n\nThank you for supporting Fonqa! 💕`,
  );
}

async function notifyVerificationApproved(telegramId) {
  return sendMessage(
    telegramId,
    `✅ <b>Profile verified!</b>\n\nYour Fonqa profile is now verified. Your ✓ badge is live.\n\n<a href="${APP_URL}">Open Fonqa →</a>`,
  );
}

async function notifyVerificationRejected(telegramId, reason) {
  return sendMessage(
    telegramId,
    `❌ <b>Verification rejected</b>\n\n${reason || 'Please retake your selfie and try again.'}\n\n<a href="${APP_URL}">Open Fonqa →</a>`,
  );
}

async function notifyReferralReward(telegramId, reward) {
  return sendMessage(
    telegramId,
    `🎁 <b>Referral reward!</b>\n\n${reward}\n\n<a href="${APP_URL}">Open Fonqa →</a>`,
  );
}

module.exports = {
  notifyMatch,
  notifyLike,
  notifyMessage,
  notifyProfileVisit,
  notifyPremiumActivated,
  notifyVerificationApproved,
  notifyVerificationRejected,
  notifyReferralReward,
};
