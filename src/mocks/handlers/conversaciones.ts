import { http, HttpResponse } from 'msw';
import { appConfig } from '@/lib/config';
import type { ConversacionListItem } from '@/api/types';
import { pickMensajeMock } from '../fixtures/mensajes';

const base = appConfig.BACKEND_URL_CENTRAL;

// Estado in-memory para la simulación.
const conversaciones = new Map<string, ConversacionListItem>([
  [
    'conv_demo_001',
    {
      id: 'conv_demo_001',
      titulo: 'Mortalidad última semana',
      asistente_id: 'engorda',
      creado_en: '2026-05-13T09:00:00Z',
      actualizado_en: '2026-05-13T14:30:00Z',
    },
  ],
]);

export const conversacionesHandlers = [
  http.get(`${base}/conversaciones`, () => {
    return HttpResponse.json({
      items: [...conversaciones.values()].sort((a, b) =>
        (b.actualizado_en ?? b.creado_en).localeCompare(a.actualizado_en ?? a.creado_en),
      ),
      next_cursor: null,
    });
  }),

  http.post(`${base}/conversaciones`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      titulo?: string;
      asistente_id?: string;
    } | null;
    const id = `conv_${Date.now()}`;
    const item: ConversacionListItem = {
      id,
      titulo: body?.titulo ?? 'Nueva conversación',
      asistente_id: body?.asistente_id,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };
    conversaciones.set(id, item);
    return HttpResponse.json({ id, titulo: item.titulo });
  }),

  http.delete(`${base}/conversaciones/:id`, ({ params }) => {
    conversaciones.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/conversaciones/:id/mensajes`, async ({ request, params }) => {
    const body = (await request.json().catch(() => null)) as { texto?: string } | null;
    const text = body?.texto ?? '';
    const mock = pickMensajeMock(text);
    // Update timestamp.
    const conv = conversaciones.get(String(params.id));
    if (conv) {
      conversaciones.set(conv.id, { ...conv, actualizado_en: new Date().toISOString() });
    }
    // Simular latencia leve.
    await new Promise((r) => setTimeout(r, 250));
    return HttpResponse.json(mock);
  }),

  http.post(`${base}/conversaciones/:convId/mensajes/:msgId/refresh-grafico`, async () => {
    const fresh = pickMensajeMock('mortalidad');
    return HttpResponse.json(fresh);
  }),
];
