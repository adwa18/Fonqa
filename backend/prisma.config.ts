// prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // adjust path if your schema lives in backend/prisma/schema.prisma
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Use env() from prisma/config so the CLI can resolve the URL
    url: env('DATABASE_URL'),
  },
});
