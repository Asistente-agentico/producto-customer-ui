// Respuestas mockeadas con artefactos variados — sirven como referencia
// del contrato del spec (sección 6) y de fixtures para tests.

import type { MensajeResponseRaw } from '@/api/types';

export const mensajeMortalidadFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_001',
  respuesta:
    'En los últimos 7 días, **CTR-001** registró una mortalidad acumulada de 84 peces, con un pico el día 5 asociado a un evento de temperatura elevada.',
  blocked: false,
  error: null,
  metadata: {
    chunks_used: 7,
    scopes: ['mortalidad_cultivo', 'centros_cultivo'],
    ambiguous_routing: false,
    permisos_aplicados: {
      rol: 'jefe_centro',
      filtros_jwt_aplicados: [{ campo: 'centro_id', valor: 'CTR-001' }],
    },
  },
  artefactos: [
    {
      tipo: 'serie_temporal',
      version: 1,
      grafico_rule_id: 'MORT_DIA_C001',
      titulo: 'Mortalidad diaria — Centro 001',
      subtitulo: 'Últimos 7 días · CTR-001',
      ventana_actual: '7',
      ventanas_disponibles: ['7', '30', '90', 'ciclo'],
      unidad_y: 'peces',
      puntos: [
        { x: '2026-05-07', y: 8 },
        { x: '2026-05-08', y: 10 },
        { x: '2026-05-09', y: 9 },
        { x: '2026-05-10', y: 11 },
        { x: '2026-05-11', y: 24, color: 'rojo' },
        { x: '2026-05-12', y: 14 },
        { x: '2026-05-13', y: 8 },
      ],
      rango_objetivo_y: { y_min: 0, y_max: 12, etiqueta: 'Zona objetivo' },
      metricas_resumen: {
        promedio: { etiqueta: 'Promedio', valor: 12, unidad: 'peces/día' },
        pico: { etiqueta: 'Pico', valor: 24, unidad: 'peces' },
      },
    },
    {
      tipo: 'banner',
      version: 1,
      variante: 'causal',
      mensaje:
        'El pico del día 5 coincide con elevación de temperatura por encima del umbral operativo.',
      severidad: 'media',
      icono: 'alert-triangle',
    },
  ],
};

export const mensajeTablaFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_002',
  respuesta: 'Estos son los centros activos con biomasa y FCR del último mes:',
  blocked: false,
  error: null,
  metadata: { chunks_used: 4, scopes: ['centros_cultivo'], ambiguous_routing: false },
  artefactos: [
    {
      tipo: 'tabla',
      version: 1,
      titulo: 'Centros activos',
      columnas: [
        { id: 'centro_id', label: 'Centro', tipo: 'string' },
        { id: 'biomasa', label: 'Biomasa (t)', tipo: 'number' },
        { id: 'fcr', label: 'FCR', tipo: 'number' },
      ],
      filas: [
        { centro_id: 'CTR-001', biomasa: 850, fcr: 1.42 },
        { centro_id: 'CTR-002', biomasa: 740, fcr: 1.51 },
        { centro_id: 'CTR-003', biomasa: 920, fcr: 1.38 },
      ],
      sortable: true,
      filterable: true,
    },
  ],
};

export const mensajeKpiFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_003',
  respuesta: 'Resumen ejecutivo del mes:',
  blocked: false,
  error: null,
  metadata: { chunks_used: 12, scopes: ['kpis'] },
  artefactos: [
    {
      tipo: 'tablero_kpi',
      version: 1,
      titulo: 'Resumen ejecutivo',
      subtitulo: 'Abril 2026',
      kpis: [
        {
          id: 'biomasa_total',
          etiqueta: 'Biomasa total',
          valor: '2.450 t',
          color: 'verde',
          target: '2.300 t',
          delta: '+6.5%',
          delta_tipo: 'positivo',
        },
        {
          id: 'mortalidad',
          etiqueta: 'Mortalidad',
          valor: '0.84%',
          color: 'amarillo',
          delta: '+0.12 pp',
          delta_tipo: 'negativo',
        },
        {
          id: 'fcr_promedio',
          etiqueta: 'FCR promedio',
          valor: 1.44,
          color: 'verde',
        },
        {
          id: 'costo_operativo',
          etiqueta: 'Costo operativo',
          bloqueado: true,
          mensaje: 'Sin permisos para este KPI',
        },
      ],
    },
  ],
};

// Q4 + Q5 + Q11 · Stub minimal. Sin `riesgo`, sin `requiere_confirmacion`,
// sin `adjuntos` (Q11 prohíbe adjuntos en correos). El usuario revisa
// y ejecuta en /acciones/{id_propuesta}. Q5: el chat solo emite el stub.
export const mensajeAccionFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_004',
  respuesta:
    'Preparé un correo institucional con el resumen. Revisalo en el módulo de Acciones antes de enviarlo.',
  blocked: false,
  error: null,
  metadata: { chunks_used: 5, scopes: ['mortalidad_cultivo'] },
  artefactos: [
    {
      tipo: 'accion_propuesta',
      version: 1,
      tipo_accion: 'ENVIAR_CORREO',
      id_propuesta: 'act_abc123',
      titulo: 'Notificar a Hugo Salinas',
      sub: 'Jefe Centro CTR-007 · alza mortalidad + caída O₂',
      parametros: {
        destinatario: 'hugo.salinas@empresa.cl',
        asunto: 'CTR-007 jaula 4 · alza de mortalidad y caída O₂',
        cuerpo:
          'Hugo,\n\nDetectamos un alza sostenida de mortalidad en CTR-007 jaula 4 (27 u/d, +38% vs semana anterior) que correlaciona con caída de O₂ disuelto bajo 6.5 mg/L durante 72h. ¿Podemos coordinar revisión mañana AM?',
      },
      permite_edicion: ['destinatario', 'asunto', 'cuerpo'],
    },
  ],
};

export const mensajeSeleccionFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_005',
  respuesta: 'Tengo varios centros con datos. ¿De cuál te gustaría ver la mortalidad?',
  blocked: false,
  error: null,
  metadata: { chunks_used: 2, scopes: ['centros_cultivo'], ambiguous_routing: true },
  artefactos: [
    {
      tipo: 'seleccion',
      version: 1,
      pregunta: '¿De qué centro?',
      opciones: [
        { value: 'CTR-001', label: 'Centro 001 — Patagonia Norte' },
        { value: 'CTR-002', label: 'Centro 002 — Patagonia Sur' },
        { value: 'CTR-003', label: 'Centro 003 — Aysén' },
      ],
      multi: false,
    },
  ],
};

export const mensajeUnknownFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_006',
  respuesta: 'Esta respuesta incluye un artefacto futuro que la UI no reconoce todavía.',
  blocked: false,
  error: null,
  metadata: { chunks_used: 1, scopes: [] },
  artefactos: [
    {
      tipo: 'banner',
      version: 1,
      variante: 'info',
      mensaje: 'Forward compat: la UI debe mostrar placeholder para tipos desconocidos.',
    },
    {
      tipo: 'futuro_v3',
      version: 7,
      payload: { foo: 'bar', baz: 42 },
    },
  ],
};

/** Selecciona un fixture según palabras clave en la consulta. */
export function pickMensajeMock(text: string): MensajeResponseRaw {
  const t = text.toLowerCase();
  if (t.includes('mortalidad')) return mensajeMortalidadFixture;
  if (t.includes('centro') || t.includes('biomasa') || t.includes('tabla')) {
    return mensajeTablaFixture;
  }
  if (t.includes('kpi') || t.includes('resumen')) return mensajeKpiFixture;
  if (t.includes('correo') || t.includes('email') || t.includes('accion')) {
    return mensajeAccionFixture;
  }
  if (t.includes('cual') || t.includes('seleccionar')) return mensajeSeleccionFixture;
  if (t.includes('futuro') || t.includes('unknown')) return mensajeUnknownFixture;
  // Default: respuesta texto plana.
  return {
    mensaje_id: `msg_${Date.now()}`,
    respuesta:
      'Mensaje genérico de prueba. Probá con palabras como **mortalidad**, **centros**, **KPI**, **correo** o **seleccionar** para ver distintos artefactos.',
    blocked: false,
    error: null,
    metadata: { chunks_used: 0, scopes: [] },
    artefactos: [],
  };
}
