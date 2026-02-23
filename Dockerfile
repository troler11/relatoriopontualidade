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

# Copia apenas o necessário para rodar
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public 

# Instala apenas dependências de produção (economiza espaço)
RUN npm install --omit=dev

EXPOSE 80

# SOLUÇÃO DEFINITIVA: O comando 'find' localiza o server.js mesmo se estiver em dist/src/
# Isso elimina o erro de MODULE_NOT_FOUND para sempre.
CMD ["sh", "-c", "node $(find dist -name server.js | head -n 1)"]
