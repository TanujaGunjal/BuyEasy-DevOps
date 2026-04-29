# ─── Stage 1: Build ───────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# The build context is set to the project root (.), 
# so we can access the root package.json for backend dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy the backend source code into a backend folder
COPY backend ./backend

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Copy built artefacts from builder stage
COPY --from=builder /app .

# Expose backend port
EXPOSE 5000

# Health-check so Docker/Compose knows when the server is ready
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/ || exit 1

# Start the server (path is backend/server.js)
CMD ["node", "backend/server.js"]
