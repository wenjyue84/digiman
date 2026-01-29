FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /src

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
