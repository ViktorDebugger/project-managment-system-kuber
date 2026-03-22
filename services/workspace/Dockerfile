FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/workspace ./services/workspace
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-timeout 120000 && npm install
WORKDIR /app/services/workspace
RUN npx prisma generate
RUN npm run build
RUN chmod +x docker-entrypoint.sh
EXPOSE 3002
ENTRYPOINT ["./docker-entrypoint.sh"]
