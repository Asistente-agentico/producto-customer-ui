import { http, HttpResponse } from 'msw';
import type { Accion, AgenteCatalogo, EstadoAccion } from '@/api/types';

const ACCIONES_BASE = 'http://localhost:8083';

const USER_EMAIL = 'matias.vergara@demo-salmonera.cl';
const USER_NAME = 'Matías Vergara';

function nowIso(): string {
  return new Date().toISOString();
}
function genId(): string {
  return `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Cola in-memory inicial con ejemplos de los 4 estados.
const acciones = new Map<string, Accion>([
  [
    'act_abc123',
    {
      id: 'act_abc123',
      tipo: 'ENVIAR_CORREO',
      titulo: 'Notificar a Hugo Salinas',
      sub: 'Jefe Centro CTR-007 · alza mortalidad + caída O₂',
      estado: 'pendiente',
      origen: 'Conversación · 14:32',
      parametros: {
        destinatario: 'hugo.salinas@empresa.cl',
        asunto: 'CTR-007 jaula 4 · alza de mortalidad y caída O₂',
        cuerpo:
          'Hugo,\n\nDetectamos un alza sostenida de mortalidad en CTR-007 jaula 4 (27 u/d, +38% vs semana anterior) que correlaciona con caída de O₂ disuelto bajo 6.5 mg/L durante 72h. ¿Podemos coordinar revisión mañana AM?',
      },
      audit: [
        {
          ts: nowIso(),
          actor: 'asistente.engorda',
          accion: 'Acción propuesta',
          detalle: 'Generada por LLM tras consulta sobre mortalidad',
        },
      ],
      creada_en: nowIso(),
    },
  ],
  [
    'act_6a01',
    {
      id: 'act_6a01',
      tipo: 'AGENTE_IA',
      titulo: 'Disparar agente · calibración aireadores',
      sub: 'Revisión remota CTR-007 · estimado 12 min',
      estado: 'pendiente',
      origen: 'Manual',
      permiso_requerido: 'disparar_agente_aireadores',
      parametros: { centro_id: 'CTR-007', motivo: 'O2 bajo umbral' },
      audit: [
        {
          ts: nowIso(),
          actor: USER_NAME,
          accion: 'Borrador creado',
          detalle: 'Acción manual desde panel "+ Nueva"',
        },
      ],
      creada_en: nowIso(),
    },
  ],
  [
    'act_5e88',
    {
      id: 'act_5e88',
      tipo: 'ENVIAR_CORREO',
      titulo: 'Resumen semanal a Gerencia',
      sub: 'Mortalidad + FCR + biomasa · 4 centros',
      estado: 'ejecutada',
      origen: 'Conversación · 11:08',
      parametros: {
        destinatario: 'gerencia@empresa.cl',
        asunto: 'Resumen operativo semana 19',
        cuerpo: 'Resumen consolidado de las métricas...',
      },
      audit: [
        { ts: nowIso(), actor: 'asistente.engorda', accion: 'Acción propuesta' },
        { ts: nowIso(), actor: USER_NAME, accion: 'Revisión' },
        { ts: nowIso(), actor: USER_NAME, accion: 'Ejecutada', detalle: 'Enviada vía SMTP' },
      ],
      creada_en: nowIso(),
      ejecutada_en: nowIso(),
    },
  ],
  [
    'act_3d12',
    {
      id: 'act_3d12',
      tipo: 'ENVIAR_CORREO',
      titulo: 'Alerta inicial Hugo Salinas',
      sub: 'Borrador previo · descartado',
      estado: 'rechazada',
      origen: 'Conversación · 14:18',
      parametros: {},
      audit: [
        { ts: nowIso(), actor: 'asistente.engorda', accion: 'Acción propuesta' },
        { ts: nowIso(), actor: USER_NAME, accion: 'Descartada' },
      ],
      creada_en: nowIso(),
    },
  ],
]);

// Catálogo de agentes (tab "Agente" del composer).
const agentes: AgenteCatalogo[] = [
  {
    id: 'aireadores',
    nombre: 'Calibración de aireadores',
    descripcion:
      'Ajusta automáticamente los parámetros de aireadores en centros con O₂ bajo umbral.',
    permiso_requerido: 'disparar_agente_aireadores',
    estimado: '~12 min',
  },
  {
    id: 'muestreo',
    nombre: 'Coordinar muestreo branquial',
    descripcion: 'Agenda visita técnica para muestreo en jaulas afectadas.',
    permiso_requerido: 'disparar_agente_muestreo',
    estimado: '24h',
  },
  {
    id: 'alimentacion',
    nombre: 'Ajuste de alimentación',
    descripcion: 'Recalcula curvas de alimentación según peso medio y FCR objetivo.',
    permiso_requerido: 'disparar_agente_alimentacion',
    estimado: '~5 min',
  },
];

function appendAudit(id: string, actor: string, accion: string, detalle?: string) {
  const a = acciones.get(id);
  if (!a) return;
  acciones.set(id, {
    ...a,
    audit: [...a.audit, { ts: nowIso(), actor, accion, detalle }],
  });
}

function changeState(
  id: string,
  estado: EstadoAccion,
  audit?: { actor: string; accion: string; detalle?: string },
) {
  const a = acciones.get(id);
  if (!a) return;
  acciones.set(id, {
    ...a,
    estado,
    ejecutada_en: estado === 'ejecutada' ? nowIso() : a.ejecutada_en,
    audit: audit
      ? [
          ...a.audit,
          { ts: nowIso(), actor: audit.actor, accion: audit.accion, detalle: audit.detalle },
        ]
      : a.audit,
  });
}

export const accionesHandlers = [
  http.get(`${ACCIONES_BASE}/acciones`, () => {
    const items = [...acciones.values()].sort((a, b) => b.creada_en.localeCompare(a.creada_en));
    return HttpResponse.json({ items });
  }),

  http.get(`${ACCIONES_BASE}/acciones/catalogo-agentes`, () => {
    return HttpResponse.json(agentes);
  }),

  http.get(`${ACCIONES_BASE}/acciones/:id`, ({ params }) => {
    const a = acciones.get(String(params.id));
    if (!a) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Acción no encontrada.' } },
        { status: 404 },
      );
    }
    return HttpResponse.json(a);
  }),

  http.post(`${ACCIONES_BASE}/acciones`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      tipo?: 'ENVIAR_CORREO' | 'AGENTE_IA';
      titulo?: string;
      sub?: string;
      parametros?: Record<string, unknown>;
      permiso_requerido?: string;
      origen?: string;
    } | null;

    if (!body?.tipo || !body.titulo) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Falta tipo o titulo.' } },
        { status: 400 },
      );
    }

    // Q11.3 · rechazar adjuntos en correos.
    if (body.tipo === 'ENVIAR_CORREO') {
      const params = body.parametros ?? {};
      if (Array.isArray((params as Record<string, unknown>)['adjuntos'])) {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message:
                'Los correos no admiten adjuntos. Si necesitás compartir datos, generá un reporte desde el módulo Reportes.',
            },
          },
          { status: 400 },
        );
      }
    }

    const id = genId();
    const item: Accion = {
      id,
      tipo: body.tipo,
      titulo: body.titulo,
      sub: body.sub,
      estado: 'pendiente',
      origen: body.origen ?? 'Manual',
      parametros: body.parametros ?? {},
      permiso_requerido: body.permiso_requerido,
      audit: [{ ts: nowIso(), actor: USER_NAME, accion: 'Borrador creado', detalle: body.origen }],
      creada_en: nowIso(),
    };
    acciones.set(id, item);
    return HttpResponse.json(item);
  }),

  http.put(`${ACCIONES_BASE}/acciones/:id`, async ({ request, params }) => {
    const id = String(params.id);
    const a = acciones.get(id);
    if (!a) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Acción no encontrada.' } },
        { status: 404 },
      );
    }
    if (a.estado !== 'pendiente') {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Solo se pueden editar acciones en estado pendiente.',
          },
        },
        { status: 400 },
      );
    }
    const body = (await request.json().catch(() => ({}))) as Partial<Accion>;
    const next: Accion = { ...a, ...body, id: a.id, estado: a.estado, audit: a.audit };
    acciones.set(id, next);
    appendAudit(id, USER_NAME, 'Editada');
    return HttpResponse.json(acciones.get(id));
  }),

  http.post(`${ACCIONES_BASE}/acciones/:id/ejecutar`, ({ params }) => {
    const id = String(params.id);
    const a = acciones.get(id);
    if (!a) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Acción no encontrada.' } },
        { status: 404 },
      );
    }
    if (a.estado !== 'pendiente') {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Solo se pueden ejecutar acciones pendientes.',
          },
        },
        { status: 400 },
      );
    }
    // Q11.7 · simulación de validación del from para correos.
    if (a.tipo === 'ENVIAR_CORREO') {
      const from = (a.parametros as Record<string, unknown>)['from'];
      if (from !== undefined && from !== USER_EMAIL) {
        return HttpResponse.json(
          {
            error: {
              code: 'RBAC_DENIED',
              message: `El 'from' debe coincidir con tu correo institucional (${USER_EMAIL}).`,
            },
          },
          { status: 403 },
        );
      }
    }
    changeState(id, 'ejecutada', {
      actor: USER_NAME,
      accion: 'Ejecutada',
      detalle: a.tipo === 'ENVIAR_CORREO' ? 'Enviada vía SMTP' : 'Agente disparado',
    });
    return HttpResponse.json(acciones.get(id));
  }),

  http.post(`${ACCIONES_BASE}/acciones/:id/descartar`, ({ params }) => {
    const id = String(params.id);
    const a = acciones.get(id);
    if (!a) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Acción no encontrada.' } },
        { status: 404 },
      );
    }
    changeState(id, 'rechazada', { actor: USER_NAME, accion: 'Descartada' });
    return HttpResponse.json(acciones.get(id));
  }),
];

// Helpers para tests
export function _resetAcciones(): void {
  // No-op por ahora — el state inicial se mantiene entre tests.
  // En tests específicos se usa server.use() para overrides.
}
