# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Copy everything first
COPY . .

# Now package.json exists, so install works
RUN npm install --omit=dev

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5000
CMD ["node", "server.js"]