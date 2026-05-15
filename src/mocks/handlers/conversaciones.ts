import { http, HttpResponse } from 'msw';
import { appConfig } from '@/lib/config';
import type { ConversacionListItem, MensajeHistorialRaw } from '@/api/types';
import { pickMensajeMock } from '../fixtures/mensajes';
import { detectAmbito } from '@/lib/ambitos';

const base = appConfig.BACKEND_URL_CENTRAL;

const AMBITOS_AUTORIZADOS = ['mortalidad', 'calidad_agua', 'productividad'];
const DEFAULT_ASISTENTE = 'engorda';

// Helpers para semanas pasadas en demo (sidebar muestra hasta 4 semanas).
function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Conversaciones de ejemplo distribuidas en distintos ámbitos y
// semanas. Permite ver el sidebar jerárquico funcionando en demo.
const conversaciones = new Map<string, ConversacionListItem>([
  [
    'conv_demo_001',
    {
      id: 'conv_demo_001',
      titulo: 'Mortalidad última semana en CTR-007',
      asistente_id: 'engorda',
      ambito_id: 'mortalidad',
      creado_en: diasAtras(1),
      actualizado_en: diasAtras(0),
    },
  ],
  [
    'conv_demo_002',
    {
      id: 'conv_demo_002',
      titulo: 'O₂ disuelto bajo umbral · CTR-003',
      asistente_id: 'engorda',
      ambito_id: 'calidad_agua',
      creado_en: diasAtras(3),
      actualizado_en: diasAtras(2),
    },
  ],
  [
    'conv_demo_003',
    {
      id: 'conv_demo_003',
      titulo: 'FCR semana 18 vs semana 17',
      asistente_id: 'engorda',
      ambito_id: 'productividad',
      creado_en: diasAtras(9),
      actualizado_en: diasAtras(9),
    },
  ],
  [
    'conv_demo_004',
    {
      id: 'conv_demo_004',
      titulo: 'Biomasa proyectada Q3',
      asistente_id: 'engorda',
      ambito_id: 'productividad',
      creado_en: diasAtras(15),
      actualizado_en: diasAtras(15),
    },
  ],
  [
    'conv_demo_005',
    {
      id: 'conv_demo_005',
      titulo: 'Brote sospechoso CTR-001',
      asistente_id: 'engorda',
      ambito_id: 'mortalidad',
      creado_en: diasAtras(22),
      actualizado_en: diasAtras(22),
    },
  ],
]);

const mensajesPorConv = new Map<string, MensajeHistorialRaw[]>([
  [
    'conv_demo_001',
    [
      { rol: 'user', texto: 'Mortalidad última semana en CTR-007', ts: diasAtras(1) },
      { rol: 'assistant', ts: diasAtras(1), respuesta: pickMensajeMock('mortalidad') },
    ],
  ],
]);

function appendMensaje(convId: string, mensaje: MensajeHistorialRaw) {
  const list = mensajesPorConv.get(convId) ?? [];
  list.push(mensaje);
  mensajesPorConv.set(convId, list);
}

export const conversacionesHandlers = [
  http.get(`${base}/conversaciones`, () => {
    return HttpResponse.json({
      items: [...conversaciones.values()].sort((a, b) =>
        (b.actualizado_en ?? b.creado_en).localeCompare(a.actualizado_en ?? a.creado_en),
      ),
      next_cursor: null,
    });
  }),

  http.get(`${base}/conversaciones/:id`, ({ params }) => {
    const conv = conversaciones.get(String(params.id));
    if (!conv) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Conversación no encontrada.' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      ...conv,
      mensajes: mensajesPorConv.get(conv.id) ?? [],
    });
  }),

  http.post(`${base}/conversaciones`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      titulo?: string;
      asistente_id?: string;
      ambito_id?: string;
      texto_inicial?: string;
    } | null;
    const id = `conv_${Date.now()}`;
    // Si el cliente no manda ámbito explícito y manda texto inicial,
    // el "backend" (mock) lo calcula con detectAmbito server-side
    // (simulando lo que hará el central V2).
    const ambito =
      body?.ambito_id ??
      (body?.texto_inicial
        ? (detectAmbito(body.texto_inicial, AMBITOS_AUTORIZADOS) ?? undefined)
        : undefined);
    const item: ConversacionListItem = {
      id,
      titulo: body?.titulo ?? 'Nueva conversación',
      asistente_id: body?.asistente_id ?? DEFAULT_ASISTENTE,
      ambito_id: ambito,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };
    conversaciones.set(id, item);
    mensajesPorConv.set(id, []);
    return HttpResponse.json({ id, titulo: item.titulo, ambito_id: item.ambito_id });
  }),

  http.delete(`${base}/conversaciones/:id`, ({ params }) => {
    const id = String(params.id);
    conversaciones.delete(id);
    mensajesPorConv.delete(id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/conversaciones/:id/mensajes`, async ({ request, params }) => {
    const body = (await request.json().catch(() => null)) as { texto?: string } | null;
    const text = body?.texto ?? '';
    const convId = String(params.id);
    const mock = pickMensajeMock(text);
    const conv = conversaciones.get(convId);
    if (conv) {
      // Si la conversación todavía no tiene ámbito (porque se creó sin
      // texto_inicial), lo seteamos del primer mensaje.
      const ambitoActualizado =
        conv.ambito_id ?? detectAmbito(text, AMBITOS_AUTORIZADOS) ?? undefined;
      conversaciones.set(conv.id, {
        ...conv,
        ambito_id: ambitoActualizado,
        actualizado_en: new Date().toISOString(),
      });
    }
    const now = new Date().toISOString();
    appendMensaje(convId, { rol: 'user', texto: text, ts: now });
    appendMensaje(convId, { rol: 'assistant', ts: now, respuesta: mock });
    await new Promise((r) => setTimeout(r, 250));
    return HttpResponse.json(mock);
  }),

  http.post(`${base}/conversaciones/:convId/mensajes/:msgId/refresh-grafico`, async () => {
    const fresh = pickMensajeMock('mortalidad');
    return HttpResponse.json(fresh);
  }),
];
