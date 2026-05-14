import { api } from './client';
import { log } from '@/observability/logger';

export type AuditEvent = {
  evento: string;
  recurso?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Envia un evento auditable al modulo central (seccion 4.8 y 12.1 del
 * spec). Es best-effort: si falla, lo loguea localmente y sigue — la
 * UX no debe romperse por un audit fallido.
 */
export async function auditEvent(event: AuditEvent): Promise<void> {
  try {
    await api.post<void>('/audit/event', {
      evento: event.evento,
      recurso: event.recurso,
      metadata: event.metadata,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    log.warn('observability', 'audit_event_failed', {
      evento: event.evento,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
