import { http, HttpResponse } from 'msw';
import { appConfig } from '@/lib/config';

const base = appConfig.BACKEND_URL_CENTRAL;

// In-memory log para inspección en tests.
const auditLog: unknown[] = [];

export function _getAuditLog(): unknown[] {
  return auditLog.slice();
}

export function _clearAuditLog(): void {
  auditLog.length = 0;
}

export const auditHandlers = [
  http.post(`${base}/audit/event`, async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (body) auditLog.push(body);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/accion`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      id_propuesta?: string;
      conversation_id?: string;
      parametros_finales?: Record<string, unknown>;
    } | null;
    auditLog.push({ kind: 'accion', body });
    return HttpResponse.json({
      ok: true,
      id_propuesta: body?.id_propuesta,
      resultado: 'enviado',
      ejecutado_en: new Date().toISOString(),
    });
  }),
];
