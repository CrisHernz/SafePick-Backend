# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar openssl para Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar openssl para Prisma
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV PORT=3001

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar el build y la carpeta prisma
COPY --from=builder /app/dist   ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Generar cliente, ejecutar migraciones e iniciar app
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node dist/main"]
