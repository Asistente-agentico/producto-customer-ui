import { http, HttpResponse } from 'msw';
import { appConfig } from '@/lib/config';
import { authMeFixture } from '../fixtures/auth';

const base = appConfig.BACKEND_URL_CENTRAL;

// Estado in-memory simple para simular sesión.
let isAuthenticated = true;

export const authHandlers = [
  http.get(`${base}/auth/me`, () => {
    if (!isAuthenticated) {
      return HttpResponse.json(
        { error: { code: 'AUTH_FAILED', message: 'No hay sesión activa.' } },
        { status: 401 },
      );
    }
    return HttpResponse.json(authMeFixture);
  }),

  http.post(`${base}/auth/login`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      usuario?: string;
      password?: string;
    } | null;
    if (!body?.usuario || !body?.password) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Usuario y contraseña son requeridos.',
          },
        },
        { status: 400 },
      );
    }
    isAuthenticated = true;
    return HttpResponse.json(authMeFixture, {
      headers: {
        // Las cookies HttpOnly reales las setea el backend. En mocks
        // simulamos solo el estado interno; no podemos setear HttpOnly
        // desde el service worker.
      },
    });
  }),

  http.post(`${base}/auth/refresh`, () => {
    if (!isAuthenticated) {
      return HttpResponse.json(
        { error: { code: 'AUTH_FAILED', message: 'Refresh token inválido.' } },
        { status: 401 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/auth/logout`, () => {
    isAuthenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),
];

// Helpers para tests
export function _mockSetAuth(value: boolean): void {
  isAuthenticated = value;
}
