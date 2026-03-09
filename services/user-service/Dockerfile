# Build stage
FROM node:16-alpine AS builder

WORKDIR /app

# Copy and build shared library first
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

WORKDIR /app/shared
RUN npm install && npm run build

# Create a tarball of the shared package
RUN npm pack

# Switch to user-service directory
WORKDIR /app/user-service

# Copy user-service files
COPY services/user-service/package*.json ./
COPY services/user-service/tsconfig.json ./

# Install shared library from tarball
RUN npm install /app/shared/finswitch-shared-1.0.0.tgz

# Install other dependencies
RUN npm install

# Copy source code
COPY services/user-service/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/user-service/package*.json ./

# Copy the shared library tarball
COPY --from=builder /app/shared/finswitch-shared-1.0.0.tgz /tmp/

# Install shared library from tarball first
RUN npm install /tmp/finswitch-shared-1.0.0.tgz

# Install production dependencies
RUN npm install --omit=dev

# Copy built code
COPY --from=builder /app/user-service/dist ./dist

# Clean up
RUN rm /tmp/finswitch-shared-1.0.0.tgz

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
