# ─────────────────────────────────────────────────────────────────────────────
#  SettleX Backend — Dockerfile
#  Production-ready Node.js image (Alpine, non-root user)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine

# Install dumb-init for proper signal handling (PID 1)
RUN apk add --no-cache dumb-init

# Create app directory and use non-root user for security
WORKDIR /app

# Copy only package files first (layer caching — npm install only reruns when deps change)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src/ ./src/

# Create uploads directory (volume will override in production, but good to have)
RUN mkdir -p uploads

# Set ownership to node user
RUN chown -R node:node /app
USER node

# Expose app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start with dumb-init for proper signal forwarding
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
