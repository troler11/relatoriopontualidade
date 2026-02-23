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

# Copia as dependências e o código compilado
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
# GARANTA QUE A PASTA PUBLIC ESTEJA NA RAIZ /app
COPY --from=builder /app/public ./public 

RUN npm install --omit=dev

EXPOSE 80

# Comando para rodar (usando o caminho absoluto para não ter erro)
CMD ["node", "dist/server.js"]
