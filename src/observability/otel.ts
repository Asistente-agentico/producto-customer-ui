// OpenTelemetry browser SDK (sección 12.1). No-op si endpoint vacío.

import { context, trace } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { ZoneContextManager } from '@opentelemetry/context-zone';

import { appConfig, appVersion } from '@/lib/config';
import { log } from './logger';

let initialized = false;

export function initOtel(): void {
  if (initialized) return;
  initialized = true;

  if (!appConfig.OTEL_EXPORTER_OTLP_ENDPOINT) {
    log.info('observability', 'otel_disabled', { reason: 'no_endpoint' });
    return;
  }
  if (appConfig.TELEMETRY_ENABLED !== 'true') {
    log.info('observability', 'otel_disabled', { reason: 'telemetry_off' });
    return;
  }

  try {
    const provider = new WebTracerProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: 'producto-customer-ui',
        [ATTR_SERVICE_VERSION]: appVersion,
        'tenant.id': appConfig.TENANT_ID || 'unknown',
      }),
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: `${appConfig.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '')}/v1/traces`,
          }),
        ),
      ],
    });

    provider.register({
      contextManager: new ZoneContextManager(),
    });

    registerInstrumentations({
      instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({
          // Ignorar requests del propio exporter para evitar loops.
          ignoreUrls: [/\/v1\/traces$/],
          propagateTraceHeaderCorsUrls: [/.+/],
        }),
      ],
    });

    log.info('observability', 'otel_initialized', {
      endpoint: appConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  } catch (err) {
    log.error('observability', 'otel_init_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export { trace, context };
