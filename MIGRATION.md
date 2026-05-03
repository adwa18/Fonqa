# MIGRATION.md — Upgrading HeartLink → Fonqa

## Overview
This is a breaking schema change. Follow these steps carefully to preserve user data.

---

## Step 1 — Backup existing data

```bash
# Get your Render PostgreSQL external URL from dashboard
export OLD_DB="postgresql://heartlink:xxx@host/heartlink"

pg_dump $OLD_DB > heartlink_backup_$(date +%Y%m%d).sql
echo "Backup complete"
```

---

## Step 2 — Provision new Fonqa database on Render

1. Render → New → PostgreSQL
2. Name: `fonqa-db`  
3. Region: same as your service (Frankfurt)
4. Save the **Internal** and **External** connection strings

---

## Step 3 — Push new schema

```bash
cd fonqa/backend
export DATABASE_URL="postgresql://fonqa:xxx@host/fonqa?sslmode=require"

# Push schema directly (no migration files needed for fresh DB)
npx prisma db push

echo "Schema created"
```

---

## Step 4 — Migrate existing users (optional)

If you want to preserve HeartLink users, run this migration script:

```bash
# scripts/migrate-data.js
node scripts/migrate-data.js \
  --from "postgresql://heartlink:xxx@old-host/heartlink" \
  --to   "postgresql://fonqa:xxx@new-host/fonqa"
```

The script transfers: users → profiles → photos → matches → messages  
New fields (education, religion, kidsStatus, etc.) default to null/none.

---

## Step 5 — Deploy Fonqa on Render

```bash
# Push fonqa repo to GitHub
git init && git add . && git commit -m "Fonqa v2.0"
git remote add origin https://github.com/YOU/fonqa.git
git push -u origin main

# Render dashboard:
# 1. New → Blueprint → connect fonqa repo
# 2. render.yaml auto-provisions service + DB
# 3. Set secret env vars (BOT_TOKEN, CLOUDINARY_*, etc.)
```

---

## Step 6 — Update bot URL

```bash
BOT_TOKEN=xxx WEBAPP_URL=https://fonqa.onrender.com node scripts/setup-bot.js
```

---

## Step 7 — New env vars to configure

These are new in Fonqa v2 — set them in Render dashboard:

| Variable | Description |
|---|---|
| `BOT_USERNAME` | Your bot's @username (without @) |
| `WEBAPP_URL` | Your Render service URL |
| `GOOGLE_VISION_API_KEY` | For NSFW moderation (optional) |
| `CBE_ACCOUNT` | CBE Birr account number |
| `TELEBIRR_ACCOUNT` | TeleBirr phone number |
| `BANK_ACCOUNT` | Bank account number |

---

## New Features Checklist

After deploying, test each new system:

- [ ] Profile creation with new fields (education, religion, kids, etc.)
- [ ] Preferences: "Anywhere" distance (slide to max)
- [ ] Swipe deck: verify no daily limit
- [ ] Liked Me page: shows who swiped right
- [ ] Premium flow: submit a test payment, approve via admin
- [ ] Verification: swipe 5 times to trigger selfie prompt  
- [ ] Referral: share your invite link, check progress
- [ ] Admin → Payments queue works
- [ ] Admin → Verifications queue works
- [ ] Telegram notification on match
- [ ] Paywall appears after trial ends (male user only)
- [ ] Female users always have chat access

---

## Schema Changes Summary

### New tables
- `payment_requests` — manual ETB payment submissions
- `verifications` — selfie anti-catfish records
- `profile_views` — visit tracking
- `boosts` — boost records
- `notifications` — in-app notification history

### Modified tables

**users** — added:
- `referralCode` (unique)
- `referredById`
- `referralCount`

**profiles** — added:
- `occupation`, `education`, `religion`, `kidsStatus`, `kidsCount`
- `height`, `locationLabel`, `visibility`

**subscriptions** — added:
- `trialStarted`, `trialEnds`, `trialUsed`
- `premiumStarts`, `premiumEnds`

**swipes** — changed:
- Removed `@@unique([senderId, receiverId])` → re-swipe now allowed
- Added index on `[senderId, receiverId]`

**preferences** — added:
- `religionPreference`, `educationPreference`
- `maxDistance` now nullable (null = anywhere)

### Removed
- `Subscription.paymentRef` (replaced by PaymentRequest table)
- `GenderPreference.nonbinary` enum value

---

## Rollback Plan

If something goes wrong:
1. The old HeartLink database is untouched
2. Point `DATABASE_URL` back to the old Render PostgreSQL
3. Redeploy the old heartlink repo tag

Data is safe. The Fonqa DB is a fresh deployment.
