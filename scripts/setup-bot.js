#!/usr/bin/env node
// scripts/setup-bot.js — Fonqa bot setup
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!BOT_TOKEN || !WEBAPP_URL) {
  console.error('Set BOT_TOKEN and WEBAPP_URL');
  process.exit(1);
}

function call(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🤖 Setting up Fonqa bot…\n');

  const commands = await call('setMyCommands', {
    commands: [
      { command: 'start',   description: '💕 Open Fonqa (ፎንቃ)' },
      { command: 'premium', description: '⭐ Get Premium' },
      { command: 'verify',  description: '✓ Verify my profile' },
      { command: 'invite',  description: '👥 Invite friends' },
      { command: 'help',    description: '❓ Help' },
    ],
  });
  console.log('✅ Commands:', commands.ok);

  const menu = await call('setChatMenuButton', {
    menu_button: { type: 'web_app', text: '💕 Open Fonqa', web_app: { url: WEBAPP_URL } },
  });
  console.log('✅ Menu button:', menu.ok);

  const desc = await call('setMyDescription', {
    description: '💕 Fonqa (ፎንቃ) — Dating inside Telegram\n\nSwipe · Match · Chat\nFree for women · 7-day trial for men\n\nFind your match today!',
  });
  console.log('✅ Description:', desc.ok);

  const short = await call('setMyShortDescription', {
    short_description: '💕 Fonqa — Dating app inside Telegram. Free for women!',
  });
  console.log('✅ Short desc:', short.ok);

  console.log(`\n✅ Fonqa bot ready!\nShare: https://t.me/YOUR_BOT_USERNAME\n`);
}

main().catch(console.error);
