# SIGEA — imagen para Google Cloud Run (Express sirve la API y frontend/dist)

# 1) Build del frontend (Vite). Las VITE_* se fijan aquí: docker build --build-arg VITE_APP_NAME=...
FROM node:22-slim AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_APP_NAME
ARG VITE_APP_FULL_NAME
ARG VITE_APP_DESCRIPTION
RUN npm run build

# 2) Backend solo con dependencias de producción
FROM node:22-slim
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
USER node
# Cloud Run inyecta PORT (8080 por defecto)
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
