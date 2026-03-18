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
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Install production-only dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port NestJS listens on (Cloud Run injects PORT env var)
EXPOSE 3001

# Cloud Run sets the PORT env variable; NestJS reads it in main.ts
ENV NODE_ENV=production

# Run the compiled app
CMD ["node", "dist/main"]
