import { http, HttpResponse } from 'msw';
import { appConfig } from '@/lib/config';
import type { Preferencias } from '@/api/types';

const base = appConfig.BACKEND_URL_CENTRAL;

let prefs: Preferencias = {
  idioma: 'es',
  vista_inicial: 'chat',
  notificaciones: { email: true, in_app: true },
};

export const preferenciasHandlers = [
  http.get(`${base}/usuario/preferencias`, () => HttpResponse.json(prefs)),
  http.put(`${base}/usuario/preferencias`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Partial<Preferencias> | null;
    if (body) {
      prefs = { ...prefs, ...body };
    }
    return HttpResponse.json(prefs);
  }),
];
