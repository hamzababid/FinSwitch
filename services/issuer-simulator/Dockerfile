# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared library
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install && npm run build && npm pack

# Copy issuer-simulator
WORKDIR /app/issuer-simulator
COPY services/issuer-simulator/package*.json ./

# Install shared library from tarball
RUN npm install /app/shared/finswitch-shared-*.tgz

# Install other dependencies
RUN npm install

# Copy source code
COPY services/issuer-simulator/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/issuer-simulator/package*.json ./

# Copy shared library tarball and install
COPY --from=builder /app/shared/finswitch-shared-*.tgz ./
RUN npm install --production finswitch-shared-*.tgz && \
    npm install --production && \
    rm finswitch-shared-*.tgz

# Copy built application
COPY --from=builder /app/issuer-simulator/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3003

CMD ["node", "dist/index.js"]
