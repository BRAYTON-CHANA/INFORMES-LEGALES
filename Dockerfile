# SIGEA — imagen de la app (Express sirve la API y frontend/dist). Debian 13 «trixie», igual que el
# servidor del GORE. Sirve para Cloud Run y para docker-compose.yml (servidor propio).

# 1) Build del frontend (Vite). Las VITE_* se fijan aquí: docker build --build-arg VITE_APP_NAME=...
FROM node:22-trixie-slim AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_APP_NAME
ARG VITE_APP_FULL_NAME
ARG VITE_APP_DESCRIPTION
RUN npm run build

# 2) Backend solo con dependencias de producción
FROM node:22-trixie-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY api ./api
COPY lib ./lib
COPY scripts ./scripts
COPY database ./database
COPY --from=web /app/frontend/dist ./frontend/dist
# Carpeta de los PDF en el servidor propio (ARCHIVOS_DIR; en docker-compose es un volumen)
RUN mkdir -p /datos/archivos && chown node:node /datos/archivos
USER node
# Cloud Run inyecta PORT; en docker-compose se usa 8080
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
