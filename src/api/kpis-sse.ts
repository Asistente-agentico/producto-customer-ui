// Cliente SSE para KPIs (sección 4.7 y 20.3 del spec).
//
// EventSource nativo no permite headers custom; usamos
// @microsoft/fetch-event-source. Same-origin: cookies; cross-origin:
// Authorization header (la UI lee el token desde una sesión "puente"
// expuesta por el central — pendiente de definir; mientras tanto se
// asume same-origin via reverse proxy según sección 14.2 del spec).

import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source';
import { KpiUpdateEventSchema, type KpiUpdateEvent } from './types';
import { appConfig, appVersion } from '@/lib/config';
import { log } from '@/observability/logger';

export type KpiStreamHandlers = {
  onKpiUpdate(event: KpiUpdateEvent): void;
  onHeartbeat?(ts: string | undefined): void;
  onOpen?(): void;
  onError?(err: unknown): void;
};

export type KpiStreamOptions = {
  baseUrl: string;
  metricas?: string[];
  entidades?: string[];
  /** Token explícito si el dominio es distinto al de la UI. */
  bearerToken?: string;
};

export type KpiStreamSubscription = {
  close: () => void;
};

class FatalSseError extends Error {}

/**
 * Abre la conexión SSE. Devuelve un objeto con close(). Reintenta solo
 * (manejo interno de la librería) en errores transitorios; si la
 * conexión se cierra con un status 4xx fatal, deja de reintentar.
 */
export function subscribeKpiStream(
  opts: KpiStreamOptions,
  handlers: KpiStreamHandlers,
): KpiStreamSubscription {
  const controller = new AbortController();
  const params = new URLSearchParams();
  if (opts.metricas && opts.metricas.length > 0) {
    params.set('metricas', opts.metricas.join(','));
  }
  if (opts.entidades && opts.entidades.length > 0) {
    params.set('entidades', opts.entidades.join(','));
  }
  const url = `${opts.baseUrl.replace(/\/+$/, '')}/stream${params.toString() ? `?${params}` : ''}`;

  const sameOrigin = isSameOrigin(opts.baseUrl);
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'X-Client-Version': appVersion,
    'Accept-Language': appConfig.IDIOMA_DEFAULT,
  };
  if (!sameOrigin && opts.bearerToken) {
    headers['Authorization'] = `Bearer ${opts.bearerToken}`;
  }

  void fetchEventSource(url, {
    signal: controller.signal,
    credentials: sameOrigin ? 'include' : 'omit',
    headers,
    openWhenHidden: false,
    onopen: async (response) => {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        log.info('sse', 'kpi_stream_open', { url });
        handlers.onOpen?.();
        return;
      }
      // 4xx no recuperable.
      if (response.status >= 400 && response.status < 500) {
        log.warn('sse', 'kpi_stream_fatal', { status: response.status });
        throw new FatalSseError(`fatal: ${response.status}`);
      }
      // 5xx: dejar que fetch-event-source reintente.
      log.warn('sse', 'kpi_stream_retry', { status: response.status });
      throw new Error(`retry: ${response.status}`);
    },
    onmessage(ev: EventSourceMessage) {
      if (ev.event === 'heartbeat') {
        try {
          const parsed = JSON.parse(ev.data || '{}') as { ts?: string };
          handlers.onHeartbeat?.(parsed.ts);
        } catch {
          handlers.onHeartbeat?.(undefined);
        }
        return;
      }
      if (ev.event === 'kpi_update' || ev.event === '' || ev.event === 'message') {
        try {
          const raw = JSON.parse(ev.data) as unknown;
          const parsed = KpiUpdateEventSchema.safeParse(raw);
          if (parsed.success) {
            handlers.onKpiUpdate(parsed.data);
          } else {
            log.warn('sse', 'kpi_update_invalid_shape');
          }
        } catch (err) {
          log.warn('sse', 'kpi_update_parse_error', {
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
    onerror(err) {
      if (err instanceof FatalSseError) {
        handlers.onError?.(err);
        throw err; // detiene los reintentos
      }
      // Retorno void = la librería sigue reintentando con backoff.
      log.debug('sse', 'kpi_stream_transient_error', {
        message: err instanceof Error ? err.message : String(err),
      });
    },
    onclose() {
      log.info('sse', 'kpi_stream_close');
    },
  }).catch((err: unknown) => {
    handlers.onError?.(err);
  });

  return {
    close: () => controller.abort(),
  };
}

function isSameOrigin(baseUrl: string): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return new URL(baseUrl).origin === window.location.origin;
  } catch {
    return true;
  }
}
