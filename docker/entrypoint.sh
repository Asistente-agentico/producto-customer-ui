#!/bin/sh
# Materializa env vars (Capa 2) en /usr/share/nginx/html/config.js
# para que la SPA las lea desde window.__APP_CONFIG__ sin rebuild.
set -eu

CONFIG_JS=/usr/share/nginx/html/config.js

cat > "${CONFIG_JS}" <<EOF
window.__APP_CONFIG__ = {
  BACKEND_URL_CENTRAL: "${BACKEND_URL_CENTRAL:-http://central:8080}",
  AUTH_MODE: "${AUTH_MODE:-iam_interno}",
  AUTH_IDP_URL: "${AUTH_IDP_URL:-}",
  IDIOMA_DEFAULT: "${IDIOMA_DEFAULT:-es}",
  TENANT_ID: "${TENANT_ID:-}",
  OTEL_EXPORTER_OTLP_ENDPOINT: "${OTEL_EXPORTER_OTLP_ENDPOINT:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}",
  TELEMETRY_ENABLED: "${TELEMETRY_ENABLED:-true}",
  USE_MOCKS: "${USE_MOCKS:-false}"
};
EOF

# CSP runtime: el connect-src se arma con los hosts permitidos
# (central + módulos opcionales).
BACKEND_HOSTS="${BACKEND_URL_CENTRAL:-} ${BACKEND_URL_REPORTES:-} ${BACKEND_URL_KPIS:-} ${BACKEND_URL_ACCIONES:-}"
CSP_CONNECT=$(echo "${BACKEND_HOSTS}" | tr ' ' '\n' | awk 'NF' | sort -u | tr '\n' ' ')

export CSP_CONNECT

# Substituir variables en el template de nginx.conf si tiene placeholders.
# (nginx 1.19+ soporta envsubst en variables específicas, pero aquí lo
# hacemos explícito para no tocar archivos en cada arranque.)
if [ -f /etc/nginx/conf.d/default.conf.tmpl ]; then
  envsubst '${CSP_CONNECT}' < /etc/nginx/conf.d/default.conf.tmpl \
    > /etc/nginx/conf.d/default.conf
fi

exec "$@"
