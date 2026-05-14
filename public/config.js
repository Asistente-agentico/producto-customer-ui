// Dev-only fallback. En producción, /usr/share/nginx/html/config.js es
// regenerado por docker/entrypoint.sh leyendo las env vars del contenedor.
window.__APP_CONFIG__ = {
  BACKEND_URL_CENTRAL: 'http://localhost:8080',
  AUTH_MODE: 'iam_interno',
  AUTH_IDP_URL: '',
  IDIOMA_DEFAULT: 'es',
  TENANT_ID: '',
  OTEL_EXPORTER_OTLP_ENDPOINT: '',
  SENTRY_DSN: '',
  TELEMETRY_ENABLED: 'true',
  USE_MOCKS: 'true',
};
