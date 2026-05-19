import { describe, expect, it } from 'vitest';
import {
  ReportDefinitionSchema,
  DatamartSchema,
  PreviewPayloadSchema,
  PreflightResultSchema,
  TimelineEventSchema,
  ObservationSchema,
  RoleSchema,
} from './reporte.types';

/**
 * PR 1 · smoke parsing de los tipos compartidos del módulo Reportes
 * (handoff M3 §7). Verifica defaults, enums críticos y forward-compat
 * vía `.passthrough()`.
 */

describe('ReportDefinitionSchema', () => {
  it('aplica defaults a arrays vacíos cuando se omiten', () => {
    const parsed = ReportDefinitionSchema.parse({});
    expect(parsed.filters).toEqual([]);
    expect(parsed.rows).toEqual([]);
    expect(parsed.cols).toEqual([]);
    expect(parsed.values).toEqual([]);
  });

  it('parsea una definición completa con filters, rows, cols, values', () => {
    const parsed = ReportDefinitionSchema.parse({
      filters: [{ field_id: 'fecha', op: 'gte', value: '2026-01-01' }],
      rows: [{ field_id: 'centro', table_id: 'dim_centros' }],
      cols: [{ field_id: 'mes', table_id: 'dim_tiempo' }],
      values: [{ field_id: 'monto', agg: 'sum' }],
    });
    expect(parsed.filters[0]?.value).toBe('2026-01-01');
    expect(parsed.rows[0]?.table_id).toBe('dim_centros');
    expect(parsed.values[0]?.agg).toBe('sum');
  });

  it('acepta `value` de filter como tipo arbitrario (unknown)', () => {
    const a = ReportDefinitionSchema.parse({
      filters: [{ field_id: 'flag', op: 'eq', value: true }],
    });
    const b = ReportDefinitionSchema.parse({
      filters: [{ field_id: 'n', op: 'in', value: [1, 2, 3] }],
    });
    expect(a.filters[0]?.value).toBe(true);
    expect(b.filters[0]?.value).toEqual([1, 2, 3]);
  });
});

describe('DatamartSchema', () => {
  it('parsea un catálogo con 1 fact y 1 dimension', () => {
    const parsed = DatamartSchema.parse({
      tables: [
        {
          id: 'fct_ventas',
          name: 'Ventas',
          kind: 'fact',
          fields: [
            { id: 'monto', name: 'Monto', type: 'number' },
            { id: 'cliente', name: 'Cliente', type: 'string', pii: true },
          ],
        },
        {
          id: 'dim_tiempo',
          name: 'Tiempo',
          kind: 'dimension',
          fields: [{ id: 'fecha', name: 'Fecha', type: 'date' }],
        },
      ],
    });
    expect(parsed.tables).toHaveLength(2);
    expect(parsed.tables[0]?.kind).toBe('fact');
    expect(parsed.tables[0]?.fields[1]?.pii).toBe(true);
  });

  it('default `tables: []` cuando se omite', () => {
    const parsed = DatamartSchema.parse({});
    expect(parsed.tables).toEqual([]);
  });

  it('rechaza `kind` fuera del enum fact|dimension', () => {
    const result = DatamartSchema.safeParse({
      tables: [{ id: 't', name: 'T', kind: 'cube' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('PreviewPayloadSchema', () => {
  it('parsea respuesta con columns y rows', () => {
    const parsed = PreviewPayloadSchema.parse({
      columns: ['centro', 'monto'],
      rows: [
        ['CTR-001', 1234.5],
        ['CTR-002', 987],
      ],
      total_rows: 2,
      sample_size: 2,
      truncated: false,
      generated_at: '2026-05-18T10:00:00Z',
    });
    expect(parsed.columns).toHaveLength(2);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.total_rows).toBe(2);
  });

  it('aplica defaults a columns/rows vacíos', () => {
    const parsed = PreviewPayloadSchema.parse({});
    expect(parsed.columns).toEqual([]);
    expect(parsed.rows).toEqual([]);
  });
});

describe('PreflightResultSchema', () => {
  it('parsea checks con los 3 estados pass/fail/warn', () => {
    const parsed = PreflightResultSchema.parse({
      checks: [
        { id: 'pivot', label: 'Pivot definido', status: 'pass' },
        { id: 'freq', label: 'Frecuencia', status: 'warn', detail: 'on_demand' },
        { id: 'pii', label: 'PII detectada', status: 'fail', detail: 'rut sin masking' },
      ],
      can_approve: false,
    });
    expect(parsed.checks).toHaveLength(3);
    expect(parsed.can_approve).toBe(false);
    expect(parsed.checks[2]?.status).toBe('fail');
  });

  it('requiere `can_approve` (no es opcional)', () => {
    const result = PreflightResultSchema.safeParse({ checks: [] });
    expect(result.success).toBe(false);
  });

  it('rechaza status fuera del enum', () => {
    const result = PreflightResultSchema.safeParse({
      checks: [{ id: 'x', label: 'X', status: 'unknown' }],
      can_approve: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('TimelineEventSchema', () => {
  it('parsea un evento con campos canónicos', () => {
    const parsed = TimelineEventSchema.parse({
      ts: '2026-05-18T12:34:56Z',
      actor: 'u_creator',
      accion: 'submit_for_validation',
      detalle: 'enviado por el creador',
    });
    expect(parsed.actor).toBe('u_creator');
    expect(parsed.accion).toBe('submit_for_validation');
  });

  it('detalle es opcional', () => {
    const parsed = TimelineEventSchema.parse({
      ts: '2026-05-18T00:00:00Z',
      actor: 'sistema',
      accion: 'auto_purge',
    });
    expect(parsed.detalle).toBeUndefined();
  });
});

describe('ObservationSchema', () => {
  it('parsea observación abierta con anchor y mentions', () => {
    const parsed = ObservationSchema.parse({
      id: 'obs_1',
      author: 'u_validator',
      role: 'validador',
      anchor: 'definition.values[0]',
      text: 'Falta agregación por mes',
      status: 'open',
      created_at: '2026-05-18T10:00:00Z',
      mentions: ['u_creator'],
    });
    expect(parsed.status).toBe('open');
    expect(parsed.mentions).toEqual(['u_creator']);
  });

  it('parsea observación resuelta con resolved_at', () => {
    const parsed = ObservationSchema.parse({
      id: 'obs_2',
      author: 'u_validator',
      role: 'validador',
      text: 'ok',
      status: 'resolved',
      created_at: '2026-05-18T10:00:00Z',
      resolved_at: '2026-05-18T12:00:00Z',
    });
    expect(parsed.status).toBe('resolved');
    expect(parsed.resolved_at).toBe('2026-05-18T12:00:00Z');
  });

  it('rechaza status fuera del enum open|resolved', () => {
    const result = ObservationSchema.safeParse({
      id: 'obs_3',
      author: 'u',
      role: 'r',
      text: 't',
      status: 'pending',
      created_at: '2026-05-18T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('RoleSchema', () => {
  it('parsea rol mínimo (id + label)', () => {
    const parsed = RoleSchema.parse({ id: 'aprobador', label: 'Aprobador' });
    expect(parsed.id).toBe('aprobador');
    expect(parsed.jerarquia).toBeUndefined();
  });

  it('parsea rol con jerarquía', () => {
    const parsed = RoleSchema.parse({ id: 'gerente', label: 'Gerente', jerarquia: 3 });
    expect(parsed.jerarquia).toBe(3);
  });
});

describe('forward-compat · passthrough en todos los schemas', () => {
  it('acepta campos no declarados sin errores', () => {
    const datamart = DatamartSchema.parse({
      tables: [],
      version: 'v3', // futuro campo del central
    }) as Record<string, unknown>;
    expect(datamart.version).toBe('v3');

    const role = RoleSchema.parse({
      id: 'r',
      label: 'R',
      tenant_scope: 'global',
    }) as Record<string, unknown>;
    expect(role.tenant_scope).toBe('global');
  });
});
