import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { appConfig } from '@/lib/config';
import { auditEvent } from './audit';
import { _clearAuditLog, _getAuditLog } from '@/mocks/handlers/audit';

beforeEach(() => _clearAuditLog());
afterEach(() => _clearAuditLog());

describe('auditEvent', () => {
  it('manda el evento al endpoint /audit/event', async () => {
    await auditEvent({ evento: 'login', metadata: { metodo: 'iam_interno' } });
    const log = _getAuditLog();
    expect(log.length).toBeGreaterThan(0);
    const last = log[log.length - 1] as { evento: string };
    expect(last.evento).toBe('login');
  });

  it('no relanza si el backend falla (best-effort)', async () => {
    server.use(
      http.post(`${appConfig.BACKEND_URL_CENTRAL}/audit/event`, () =>
        HttpResponse.json({ error: { code: 'BACKEND_ERROR', message: 'down' } }, { status: 500 }),
      ),
    );
    await expect(auditEvent({ evento: 'falla' })).resolves.toBeUndefined();
  });
});
