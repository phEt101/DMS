FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY database ./database
COPY scripts ./scripts

USER node
EXPOSE 3000

CMD ["npm", "start"]
