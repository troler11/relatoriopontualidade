# Estágio 1: Construção (Build)
FROM node:20-slim AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instala todas as dependências (incluindo as de desenvolvimento para o build)
RUN npm install

# Copia o restante do código fonte
COPY . .

# Transpila o TypeScript para JavaScript (gera a pasta /dist ou /build)
RUN npm run build

# Estágio 2: Produção (Final)
FROM node:20-slim

WORKDIR /app

# Define a variável de ambiente para produção
ENV NODE_ENV=production

# Copia apenas os arquivos necessários do estágio de builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instala apenas dependências de produção (reduz o tamanho da imagem)
RUN npm install --omit=dev

# Expõe a porta que sua API usa (3000 conforme o código anterior)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "dist/server.js"]
