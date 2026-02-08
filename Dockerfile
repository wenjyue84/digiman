# Dockerfile for Zeabur deployment
FROM node:22-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Use npm install instead of npm ci to resolve platform-specific optional deps
# (npm ci strictly follows lockfile which may lack linux-musl binaries)
RUN npm install --include=dev

# Copy source code
COPY . .

# Build the application (needs Vite, TypeScript, esbuild from devDependencies)
RUN npm run build

# Prune devDependencies after build to reduce image size
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Zeabur uses PORT environment variable (default 5000)
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start the production server
CMD ["npm", "start"]
