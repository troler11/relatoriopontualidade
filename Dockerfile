# Estágio 1: Build (Compilação do TypeScript)
FROM node:20-slim AS builder

WORKDIR /app

# Copia arquivos de configuração de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instala todas as dependências
RUN npm install

# Copia o código fonte e a pasta public
COPY . .

# Converte TypeScript para JavaScript (gera a pasta dist)
RUN npm run build

# Estágio 2: Produção
FROM node:20-slim

WORKDIR /app

# Variável de ambiente para otimização do Node
ENV NODE_ENV=production

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
# COPIA A PASTA PUBLIC PARA O CONTAINER FINAL (Essencial para o index.html)
COPY --from=builder /app/public ./public

# Instala apenas dependências de produção
RUN npm install --omit=dev

# Expõe a porta 80 (conforme definido no seu server.ts)
EXPOSE 80

# Inicia o servidor
CMD ["node", "dist/server.js"]
