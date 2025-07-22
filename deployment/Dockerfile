# VIDA³ Streaming Application - Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vida -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=vida:nodejs /app/dist ./dist
COPY --from=builder --chown=vida:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vida:nodejs /app/package*.json ./

# Copy necessary files
COPY --from=builder --chown=vida:nodejs /app/server ./server
COPY --from=builder --chown=vida:nodejs /app/shared ./shared
COPY --from=builder --chown=vida:nodejs /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p /app/logs /app/temp /app/uploads && \
    chown -R vida:nodejs /app/logs /app/temp /app/uploads

# Switch to non-root user
USER vida

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"] 