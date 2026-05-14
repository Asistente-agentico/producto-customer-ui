// Lee window.__APP_CONFIG__ (Capa 2 — deploy-time) con defaults seguros
// para que la SPA nunca quede en blanco si el archivo no se cargó.
// Capa 3 (capabilities) se aplica después, en src/stores/capabilities.

const FALLBACK: AppConfig = {
  BACKEND_URL_CENTRAL: 'http://localhost:8080',
  AUTH_MODE: 'iam_interno',
  AUTH_IDP_URL: '',
  IDIOMA_DEFAULT: 'es',
  TENANT_ID: '',
  OTEL_EXPORTER_OTLP_ENDPOINT: '',
  SENTRY_DSN: '',
  TELEMETRY_ENABLED: 'true',
  USE_MOCKS: 'false',
};

function normalize(raw: Partial<AppConfig> | undefined): AppConfig {
  const merged = { ...FALLBACK, ...(raw ?? {}) };
  if (merged.AUTH_MODE !== 'idp_externo' && merged.AUTH_MODE !== 'iam_interno') {
    merged.AUTH_MODE = 'iam_interno';
  }
  if (
    merged.IDIOMA_DEFAULT !== 'es' &&
    merged.IDIOMA_DEFAULT !== 'en' &&
    merged.IDIOMA_DEFAULT !== 'pt'
  ) {
    merged.IDIOMA_DEFAULT = 'es';
  }
  return merged;
}

export const appConfig: AppConfig = normalize(
  typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined,
);

export const useMocks = appConfig.USE_MOCKS === 'true';
export const telemetryEnabled = appConfig.TELEMETRY_ENABLED === 'true';
export const appVersion = __APP_VERSION__;
