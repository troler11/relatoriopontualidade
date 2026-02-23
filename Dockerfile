# Estágio de Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de Produção
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

RUN npm install --omit=dev

# O pulo do gato: Procurar o server.js recursivamente caso ele esteja em dist/src/server.js
CMD ["sh", "-c", "node $(find dist -name server.js | head -n 1)"]
