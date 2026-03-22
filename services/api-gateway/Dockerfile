FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-timeout 120000 && npm install
WORKDIR /app/services/api-gateway
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
