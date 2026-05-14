# syntax=docker/dockerfile:1.7

# -------- Stage 1: build --------
FROM node:20-alpine AS build
WORKDIR /app

# Instalar deps con cache eficiente
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copiar fuente y construir
COPY . .
ARG VERSION=0.0.0-dev
ENV npm_package_version=${VERSION}
RUN npm run build

# -------- Stage 2: serve --------
FROM nginx:alpine AS serve

# Static assets
COPY --from=build /app/dist /usr/share/nginx/html

# nginx + entrypoint
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
 && apk add --no-cache curl tini

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
