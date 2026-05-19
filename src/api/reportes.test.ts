import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { useCapabilities } from '@/stores/capabilities';
import { ReporteSchema, descargarReporte, fetchCatalogo } from './reportes';

const REPORTES_BASE = 'http://localhost:8081';

beforeEach(async () => {
  useCapabilities.getState().clear();
  localStorage.clear();
  await useCapabilities.getState().load();
});

describe('PR 7 · ReporteSchema v2', () => {
  it('parsea un reporte con formatos[] (sin formato legacy)', () => {
    const r = ReporteSchema.parse({
      id: 'r1',
      nombre: 'Mortalidad mensual',
      gerencia: 'Operaciones',
      formatos: ['xlsx', 'pdf'],
      habilitado_para_usuario: true,
      duenio: 'Pablo',
      version_actual: 'v3.2',
      tipo: 'operativo',
    });
    expect(r.formatos).toEqual(['xlsx', 'pdf']);
    expect(r.habilitado_para_usuario).toBe(true);
    expect(r.tipo).toBe('operativo');
  });

  it('tolera reporte sin campos v2 (compat con central V1)', () => {
    const r = ReporteSchema.parse({
      id: 'r_legacy',
      nombre: 'Legacy',
      formato: 'pdf',
    });
    expect(r.formato).toBe('pdf');
    expect(r.formatos).toEqual([]); // default
    expect(r.habilitado_para_usuario).toBe(true); // default
  });

  it('rechaza tipo fuera del enum', () => {
    const result = ReporteSchema.safeParse({
      id: 'r1',
      nombre: 'X',
      tipo: 'desconocido',
    });
    expect(result.success).toBe(false);
  });
});

describe('PR 7 · fetchCatalogo', () => {
  it('trae items del mock con la shape v2', async () => {
    const catalogo = await fetchCatalogo();
    expect(catalogo.items.length).toBeGreaterThan(0);
    const operativos = catalogo.items.filter((r) => r.tipo === 'operativo');
    const gerenciales = catalogo.items.filter((r) => r.tipo === 'gerencial');
    expect(operativos.length).toBeGreaterThan(0);
    expect(gerenciales.length).toBeGreaterThan(0);
    // Al menos un reporte no habilitado para probar el filtro de la UI.
    expect(catalogo.items.some((r) => !r.habilitado_para_usuario)).toBe(true);
  });
});

describe('m3 pr-1 · ReporteSchema con ciclo de vida', () => {
  it('parsea una respuesta V2 con todos los campos del ciclo de vida', () => {
    const v2 = {
      id: 'r_001',
      nombre: 'Margen consolidado',
      formatos: ['xlsx', 'pdf'],
      habilitado_para_usuario: true,
      state: 'esperando_aprobacion' as const,
      urgent: true,
      version: 7,
      creator_id: 'u_creator',
      validator_id: 'u_validator',
      approver_id: 'u_approver',
      collaborators: [{ user_id: 'u_a', comment_count: 3 }],
      frequency_code: 'weekly' as const,
      coverage: { from: '2026-05-01', to: '2026-05-31' },
      definition: {
        filters: [{ field_id: 'fecha', op: 'gte', value: '2026-05-01' }],
        rows: [{ field_id: 'centro', table_id: 'dim_centros' }],
        cols: [{ field_id: 'semana', table_id: 'dim_tiempo' }],
        values: [{ field_id: 'monto', agg: 'sum' }],
      },
      iterations: 2,
      next_action_for: 'u_approver',
      next_action_label: 'Aprobar',
      purge_in_days: 14,
      stale: false,
      allowed_roles: ['analista', 'gerente'],
      approved_at: '2026-05-15T10:00:00Z',
      approved_by: 'u_approver',
      created_at: '2026-05-10T08:00:00Z',
      last_activity_at: '2026-05-15T10:00:00Z',
    };
    const parsed = ReporteSchema.parse(v2);
    expect(parsed.state).toBe('esperando_aprobacion');
    expect(parsed.urgent).toBe(true);
    expect(parsed.version).toBe(7);
    expect(parsed.collaborators).toHaveLength(1);
    expect(parsed.collaborators?.[0]?.user_id).toBe('u_a');
    expect(parsed.frequency_code).toBe('weekly');
    expect(parsed.coverage).toEqual({ from: '2026-05-01', to: '2026-05-31' });
    expect(parsed.definition?.filters).toHaveLength(1);
    expect(parsed.definition?.values[0]?.agg).toBe('sum');
    expect(parsed.purge_in_days).toBe(14);
    expect(parsed.allowed_roles).toEqual(['analista', 'gerente']);
  });

  it('respeta defaults de definition: arrays vacíos cuando vienen omitidos', () => {
    const parsed = ReporteSchema.parse({
      id: 'r_002',
      nombre: 'X',
      definition: {},
    });
    expect(parsed.definition?.filters).toEqual([]);
    expect(parsed.definition?.rows).toEqual([]);
    expect(parsed.definition?.cols).toEqual([]);
    expect(parsed.definition?.values).toEqual([]);
  });

  it('acepta `purge_in_days: null` (reporte sin caducidad)', () => {
    const parsed = ReporteSchema.parse({
      id: 'r_003',
      nombre: 'X',
      purge_in_days: null,
    });
    expect(parsed.purge_in_days).toBeNull();
  });

  it('rechaza un `state` fuera del enum', () => {
    const result = ReporteSchema.safeParse({
      id: 'r_004',
      nombre: 'X',
      state: 'estado_inexistente',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza un `frequency_code` fuera del enum', () => {
    const result = ReporteSchema.safeParse({
      id: 'r_005',
      nombre: 'X',
      frequency_code: 'anual',
    });
    expect(result.success).toBe(false);
  });
});

describe('PR 7 · descargarReporte', () => {
  it('usa endpoint /download con query param formato', async () => {
    let calledUrl = '';
    server.use(
      http.get(`${REPORTES_BASE}/:id/download`, ({ request }) => {
        calledUrl = request.url;
        const blob = new Blob(['x'], { type: 'application/pdf' });
        return new HttpResponse(blob, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="rx.pdf"',
          },
        });
      }),
    );
    const { filename } = await descargarReporte('rx', 'pdf');
    expect(calledUrl).toContain('/rx/download?formato=pdf');
    expect(filename).toBe('rx.pdf');
  });

  it('cae al endpoint legacy /:id si no se pasa formato', async () => {
    let calledUrl = '';
    server.use(
      http.get(`${REPORTES_BASE}/:id`, ({ request }) => {
        calledUrl = request.url;
        const blob = new Blob(['x'], { type: 'application/octet-stream' });
        return new HttpResponse(blob, {
          headers: {
            'Content-Disposition': 'attachment; filename="rx.bin"',
          },
        });
      }),
    );
    const { filename } = await descargarReporte('rx');
    expect(calledUrl).toMatch(/\/rx$/);
    expect(filename).toBe('rx.bin');
  });
});
