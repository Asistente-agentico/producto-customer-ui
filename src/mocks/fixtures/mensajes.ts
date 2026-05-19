// Respuestas mockeadas con artefactos variados — sirven como referencia
// del contrato del spec (sección 6) y de fixtures para tests.

import type { MensajeResponseRaw } from '@/api/types';

export const mensajeDefectosFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_001',
  respuesta:
    'En los últimos 7 días, **LIN-001** registró un total acumulado de 84 defectos, con un pico el día 5 asociado a un evento de temperatura elevada.',
  blocked: false,
  error: null,
  metadata: {
    chunks_used: 7,
    scopes: ['control_defectos', 'lineas_produccion'],
    ambiguous_routing: false,
    permisos_aplicados: {
      rol: 'lider_linea',
      filtros_jwt_aplicados: [{ campo: 'linea_id', valor: 'LIN-001' }],
    },
  },
  artefactos: [
    {
      tipo: 'serie_temporal',
      version: 1,
      grafico_rule_id: 'DEF_DIA_L001',
      titulo: 'Defectos diarios — Línea 001',
      subtitulo: 'Últimos 7 días · LIN-001',
      ventana_actual: '7',
      ventanas_disponibles: ['7', '30', '90', 'ciclo'],
      unidad_y: 'unidades',
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
        promedio: { etiqueta: 'Promedio', valor: 12, unidad: 'unidades/día' },
        pico: { etiqueta: 'Pico', valor: 24, unidad: 'unidades' },
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
  respuesta: 'Estas son las líneas activas con volumen y ratio insumo/salida del último mes:',
  blocked: false,
  error: null,
  metadata: { chunks_used: 4, scopes: ['lineas_produccion'], ambiguous_routing: false },
  artefactos: [
    {
      tipo: 'tabla',
      version: 1,
      titulo: 'Líneas activas',
      columnas: [
        { id: 'linea_id', label: 'Línea', tipo: 'string' },
        { id: 'volumen', label: 'Volumen (t)', tipo: 'number' },
        { id: 'ratio', label: 'Ratio insumo/salida', tipo: 'number' },
      ],
      filas: [
        { linea_id: 'LIN-001', volumen: 850, ratio: 1.42 },
        { linea_id: 'LIN-002', volumen: 740, ratio: 1.51 },
        { linea_id: 'LIN-003', volumen: 920, ratio: 1.38 },
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
          id: 'volumen_total',
          etiqueta: 'Volumen total',
          valor: '2.450 t',
          color: 'verde',
          target: '2.300 t',
          delta: '+6.5%',
          delta_tipo: 'positivo',
        },
        {
          id: 'defectos',
          etiqueta: 'Defectos',
          valor: '0.84%',
          color: 'amarillo',
          delta: '+0.12 pp',
          delta_tipo: 'negativo',
        },
        {
          id: 'ratio_insumo_salida_promedio',
          etiqueta: 'Ratio insumo/salida promedio',
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
  metadata: { chunks_used: 5, scopes: ['control_defectos'] },
  artefactos: [
    {
      tipo: 'accion_propuesta',
      version: 1,
      tipo_accion: 'ENVIAR_CORREO',
      id_propuesta: 'act_abc123',
      titulo: 'Notificar a Hugo Salinas',
      sub: 'Líder Línea LIN-007 · alza defectos + caída parámetro crítico',
      parametros: {
        destinatario: 'hugo.salinas@empresa.cl',
        asunto: 'LIN-007 máquina 4 · alza de defectos y caída de parámetro crítico',
        cuerpo:
          'Hugo,\n\nDetectamos un alza sostenida de defectos en LIN-007 máquina 4 (27 u/d, +38% vs semana anterior) que correlaciona con caída del parámetro crítico bajo 6.5 mg/L durante 72h. ¿Podemos coordinar revisión mañana AM?',
      },
      permite_edicion: ['destinatario', 'asunto', 'cuerpo'],
    },
  ],
};

export const mensajeSeleccionFixture: MensajeResponseRaw = {
  mensaje_id: 'msg_demo_005',
  respuesta: 'Tengo varias líneas con datos. ¿De cuál te gustaría ver los defectos?',
  blocked: false,
  error: null,
  metadata: { chunks_used: 2, scopes: ['lineas_produccion'], ambiguous_routing: true },
  artefactos: [
    {
      tipo: 'seleccion',
      version: 1,
      pregunta: '¿De qué línea?',
      opciones: [
        { value: 'LIN-001', label: 'Línea 001 — Planta Norte' },
        { value: 'LIN-002', label: 'Línea 002 — Planta Sur' },
        { value: 'LIN-003', label: 'Línea 003 — Planta Este' },
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
  if (t.includes('defecto')) return mensajeDefectosFixture;
  if (t.includes('linea') || t.includes('línea') || t.includes('volumen') || t.includes('tabla')) {
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
      'Mensaje genérico de prueba. Probá con palabras como **defectos**, **líneas**, **KPI**, **correo** o **seleccionar** para ver distintos artefactos.',
    blocked: false,
    error: null,
    metadata: { chunks_used: 0, scopes: [] },
    artefactos: [],
  };
}
