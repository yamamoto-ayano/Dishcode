# === Build Stage ===
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN bun install

COPY public ./public
COPY . .

RUN bun run build

# === Production Stage ===
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["bun", "start"]