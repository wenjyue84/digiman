FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

# Add build dependencies for native modules (@whiskeysockets/baileys) + curl for health checks
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Prune devDependencies after build to reduce image size
RUN npm prune --production

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Rainbow AI uses MCP_SERVER_PORT (default 3002)
EXPOSE 3002

# Health check — start-period allows for WhatsApp connection setup
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${MCP_SERVER_PORT:-3002}/health || exit 1

# Start the server
CMD ["npm", "start"]
