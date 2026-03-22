# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (sharp, etc.)
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files first for cache efficiency
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS app via SWC (outputs to /app/dist)
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Install Google Chrome Stable and necessary fonts/dependencies for Puppeteer on Debian
# Alpine Linux (musl libc) causes Protocol errors during printToPDF. Debian (glibc) is stable.
RUN apt-get update && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip installing Chrome and use the Debian installed one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files
COPY package.json package-lock.json ./

# Install production-only dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy the HTML templates
COPY public ./public

# Expose the port NestJS listens on (Cloud Run injects PORT env var)
EXPOSE 3001

# Cloud Run sets the PORT env variable; NestJS reads it in main.ts
ENV NODE_ENV=production

# Run the compiled app
CMD ["node", "dist/main"]
