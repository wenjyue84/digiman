FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

# Add build dependencies for native modules (@whiskeysockets/baileys)
RUN apk add --no-cache python3 make g++

WORKDIR /src

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
