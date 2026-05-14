import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { appConfig } from '@/lib/config';
import { api, _resetClientStateForTests, _setRedirectForTests, onApiEvent } from './client';
import { ApiError } from './errors';

const base = appConfig.BACKEND_URL_CENTRAL;

beforeEach(() => {
  _resetClientStateForTests();
  _setRedirectForTests(() => {
    /* noop en tests */
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('hace GET y parsea JSON', async () => {
    server.use(http.get(`${base}/eco`, () => HttpResponse.json({ ok: true, n: 42 })));
    const res = await api.get<{ ok: boolean; n: number }>('/eco');
    expect(res).toEqual({ ok: true, n: 42 });
  });

  it('serializa POST body como JSON con Content-Type', async () => {
    let captured: { body: unknown; contentType: string | null } | null = null;
    server.use(
      http.post(`${base}/eco`, async ({ request }) => {
        captured = {
          body: await request.json(),
          contentType: request.headers.get('content-type'),
        };
        return HttpResponse.json({ echoed: true });
      }),
    );
    await api.post('/eco', { hola: 'mundo' });
    expect(captured).not.toBeNull();
    expect(captured!.body).toEqual({ hola: 'mundo' });
    expect(captured!.contentType).toContain('application/json');
  });

  it('inyecta X-Client-Version y Accept-Language', async () => {
    let captured: { clientVersion: string | null; lang: string | null } | null = null;
    server.use(
      http.get(`${base}/eco`, ({ request }) => {
        captured = {
          clientVersion: request.headers.get('x-client-version'),
          lang: request.headers.get('accept-language'),
        };
        return HttpResponse.json({});
      }),
    );
    await api.get('/eco', { acceptLanguage: 'pt' });
    expect(captured!.clientVersion).toBeTruthy();
    expect(captured!.lang).toBe('pt');
  });

  it('lanza ApiError con code/payload del formato uniforme en 4xx', async () => {
    server.use(
      http.get(`${base}/protegido`, () =>
        HttpResponse.json(
          { error: { code: 'RBAC_DENIED', message: 'Sin permisos.' } },
          { status: 403 },
        ),
      ),
    );
    await expect(api.get('/protegido')).rejects.toBeInstanceOf(ApiError);
    try {
      await api.get('/protegido');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(403);
      expect(err.code).toBe('RBAC_DENIED');
      expect(err.message).toContain('Sin permisos');
    }
  });

  it('en 401 llama /auth/refresh y reintenta una vez', async () => {
    let refreshCalls = 0;
    let firstHit = true;
    server.use(
      http.post(`${base}/auth/refresh`, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${base}/datos`, () => {
        if (firstHit) {
          firstHit = false;
          return HttpResponse.json(
            { error: { code: 'AUTH_FAILED', message: 'expired' } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ ok: true });
      }),
    );
    const result = await api.get<{ ok: boolean }>('/datos');
    expect(refreshCalls).toBe(1);
    expect(result).toEqual({ ok: true });
  });

  it('si el refresh falla, emite auth_lost y redirige', async () => {
    const redirected: string[] = [];
    _setRedirectForTests((url) => redirected.push(url));
    const events: string[] = [];
    onApiEvent((ev) => events.push(ev.kind));
    server.use(
      http.post(`${base}/auth/refresh`, () =>
        HttpResponse.json(
          { error: { code: 'AUTH_FAILED', message: 'refresh invalido' } },
          { status: 401 },
        ),
      ),
      http.get(`${base}/datos`, () =>
        HttpResponse.json({ error: { code: 'AUTH_FAILED', message: 'expired' } }, { status: 401 }),
      ),
    );
    await expect(api.get('/datos')).rejects.toBeInstanceOf(ApiError);
    expect(events).toContain('auth_lost');
    expect(redirected).toEqual(['/login']);
  });

  it('emite new_version_available si X-Latest-Client-Version difiere', async () => {
    const events: Array<{ kind: string; latest?: string }> = [];
    onApiEvent((ev) => {
      events.push({ kind: ev.kind, ...('latest' in ev ? { latest: ev.latest } : {}) });
    });
    server.use(
      http.get(`${base}/datos`, () =>
        HttpResponse.json({ ok: true }, { headers: { 'X-Latest-Client-Version': '999.0.0' } }),
      ),
    );
    await api.get('/datos');
    expect(events.find((e) => e.kind === 'new_version_available')?.latest).toBe('999.0.0');
  });
});
