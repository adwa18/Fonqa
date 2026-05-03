# backend/Dockerfile
# Build context = repo root (fonqa/)
FROM node:20-alpine

RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# 1. Build React frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# 2. Install backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# 3. Prisma
COPY backend/prisma/ ./backend/prisma/
RUN cd backend && npx prisma generate

# 4. Source
COPY backend/src/ ./backend/src/

EXPOSE 3001
WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma db push && node src/server.js"]
