// Logger JSON estructurado (sección 12.4 del spec).
//
// - En NODE_ENV=development imprime a consola con tag legible.
// - En producción serializa una línea JSON por log.
// - Nunca incluye PII ni contenido sensible (responsabilidad del caller).

import { appConfig, appVersion } from '@/lib/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'api'
  | 'render'
  | 'auth'
  | 'sse'
  | 'lifecycle'
  | 'config'
  | 'a11y'
  | 'observability';

export type LogPayload = {
  level: LogLevel;
  category: LogCategory;
  event: string;
  context?: Record<string, unknown>;
};

const isDev = import.meta.env?.DEV === true;

function emit(payload: LogPayload): void {
  const record = {
    timestamp: new Date().toISOString(),
    level: payload.level,
    category: payload.category,
    event: payload.event,
    client_version: appVersion,
    tenant_id: appConfig.TENANT_ID || undefined,
    context: payload.context,
  };

  if (isDev) {
    const fn =
      payload.level === 'error'
        ? console.error
        : payload.level === 'warn'
          ? console.warn
          : payload.level === 'info'
            ? console.info
            : console.debug;
    fn(`[${payload.category}] ${payload.event}`, record);
    return;
  }

  // Prod: línea JSON única. nginx/container la captura como stdout.
  console.log(JSON.stringify(record));
}

export const log = {
  debug: (category: LogCategory, event: string, context?: Record<string, unknown>) =>
    emit({ level: 'debug', category, event, context }),
  info: (category: LogCategory, event: string, context?: Record<string, unknown>) =>
    emit({ level: 'info', category, event, context }),
  warn: (category: LogCategory, event: string, context?: Record<string, unknown>) =>
    emit({ level: 'warn', category, event, context }),
  error: (category: LogCategory, event: string, context?: Record<string, unknown>) =>
    emit({ level: 'error', category, event, context }),
};
