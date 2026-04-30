# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copy ALL source files (we're already inside /backend context)
COPY . .

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5000
CMD ["node", "server.js"]