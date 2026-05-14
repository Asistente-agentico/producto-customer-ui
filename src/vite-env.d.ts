/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

type AppConfig = {
  BACKEND_URL_CENTRAL: string;
  AUTH_MODE: 'iam_interno' | 'idp_externo';
  AUTH_IDP_URL: string;
  IDIOMA_DEFAULT: 'es' | 'en' | 'pt';
  TENANT_ID: string;
  OTEL_EXPORTER_OTLP_ENDPOINT: string;
  SENTRY_DSN: string;
  TELEMETRY_ENABLED: 'true' | 'false';
  USE_MOCKS: 'true' | 'false';
};

interface Window {
  __APP_CONFIG__?: Partial<AppConfig>;
}
