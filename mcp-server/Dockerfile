FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /src

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies (needed for TypeScript build)
# Use --include=dev to ensure devDependencies are installed even if NODE_ENV=production
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
