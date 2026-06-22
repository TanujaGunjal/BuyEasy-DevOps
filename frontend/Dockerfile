# ─── Stage 1: Build the React app ─────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install ALL dependencies (including devDeps needed for build)
RUN npm install
# Copy source code
COPY . .
# Build the production bundle
RUN npm run build
# ─── Stage 2: Serve with Nginx ────────────────────────────────────────────
FROM nginx:alpine
# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*
# Copy React build output to nginx html directory
COPY --from=builder /app/build /usr/share/nginx/html
# Copy custom nginx config for React Router support
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80 (nginx default)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
