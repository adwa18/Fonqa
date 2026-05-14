// backend/src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to instantiate Prisma adapter');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ adapter });
} else {
  // prevent multiple clients in dev/hot-reload
  if (!global.__prisma) global.__prisma = new PrismaClient({ adapter });
  prisma = global.__prisma;
}

module.exports = prisma;
