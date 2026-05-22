# Dockerfile — build context = repo root (fonqa/)
FROM node:20-alpine

RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# ── 1. Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── 2. Install backend
COPY backend/package*.json ./backend/
COPY backend/prisma.config.ts ./backend/
RUN cd backend && npm install

# ── 3. Prisma generate — dummy URL at build time, real URL injected at runtime
COPY backend/prisma/ ./backend/prisma/
RUN cd backend && DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

# ── 4. Source
COPY backend/src/ ./backend/src/

EXPOSE 3001
WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma db push && node src/server.js"]