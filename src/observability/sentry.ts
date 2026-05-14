// Sentry-compatible SDK (sección 12.1 del spec). Si SENTRY_DSN está vacío,
// queda como no-op — los errores se loguean a console.error vía logger.
//
// Es deliberadamente Sentry-compatible (no Sentry-exclusivo): el mismo
// SDK funciona apuntando a GlitchTip self-hosted (A10 del plan) o a
// Sentry SaaS.

import * as Sentry from '@sentry/browser';
import { appConfig, appVersion } from '@/lib/config';
import { log } from './logger';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  if (!appConfig.SENTRY_DSN) {
    log.info('observability', 'sentry_disabled', { reason: 'no_dsn' });
    return;
  }
  if (appConfig.TELEMETRY_ENABLED !== 'true') {
    log.info('observability', 'sentry_disabled', { reason: 'telemetry_off' });
    return;
  }

  Sentry.init({
    dsn: appConfig.SENTRY_DSN,
    release: appVersion,
    environment: import.meta.env?.MODE ?? 'production',
    sendDefaultPii: false,
    // Sampling conservador hasta que se calibre.
    tracesSampleRate: 0.0,
    integrations: [],
    beforeSend(event) {
      // Sección 12.3: no reportar contenido de mensajes, formularios,
      // capabilities ni JWTs. Aquí scrubeamos breadcrumbs y request body.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        if (event.request.data) {
          event.request.data = '[scrubbed]';
        }
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter((b) => b.category !== 'fetch');
      }
      return event;
    },
  });

  log.info('observability', 'sentry_initialized', { release: appVersion });
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  log.error('observability', 'captured_error', {
    message: err instanceof Error ? err.message : String(err),
    ...context,
  });
  if (initialized && appConfig.SENTRY_DSN) {
    Sentry.captureException(err, { extra: context });
  }
}
