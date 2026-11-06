# pre-settle-backend image
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies first so this layer is cached between builds.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# Run as the unprivileged "node" user that ships with the image.
USER node
EXPOSE 3000

# Node 20 has fetch built in, so no curl/wget is needed for the healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
