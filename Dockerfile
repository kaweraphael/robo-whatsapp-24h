FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY config ./config
COPY schema.sql ./
ENV PORT=8787 BANCO_ARQUIVO=/app/dados/robo.db
VOLUME /app/dados
EXPOSE 8787
CMD ["node", "src/plataformas/node.js"]
