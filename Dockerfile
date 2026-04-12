FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm ci && npm ci --prefix client

COPY . .

ENV HOST=0.0.0.0
ENV PORT=6060

EXPOSE 3000
EXPOSE 6060

CMD ["npm", "run", "dev"]
