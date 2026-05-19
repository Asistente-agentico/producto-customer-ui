import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { useCapabilities } from '@/stores/capabilities';
import {
  ReporteSchema,
  descargarReporte,
  fetchCatalogo,
  fetchInbox,
  fetchCounts,
  createReport,
  getReport,
  updateReport,
  fetchDatamart,
  previewReport,
  submitForValidation,
  validateReport,
  preflightReport,
  fetchAssignableRoles,
  approveReport,
  publishReport,
  delegateApproval,
  fetchTimeline,
  addObservation,
  resolveObservation,
  markUrgent,
  extendRetention,
} from './reportes';

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

// ===========================================================================
// PR 2 · cliente HTTP completo del módulo M3 (handoff §7).
//
// Un smoke test por endpoint. Cada test usa `server.use()` ad-hoc para
// capturar request (URL, método, body, headers) y devolver una response
// válida que el cliente parsea. Los mocks globales se difieren a los PRs
// 5-8 cuando los componentes los necesiten.
// ===========================================================================

type Captured = {
  url: string;
  method: string;
  body?: unknown;
  headers?: Headers;
};

function captureJson(
  matcher: (path: string, method: string) => boolean,
  reply: (req: Request) => unknown | Promise<unknown>,
): { captured: { value: Captured | null } } {
  const captured = { value: null as Captured | null };
  server.use(
    http.all(`${REPORTES_BASE}/*`, async ({ request }) => {
      const url = new URL(request.url);
      if (!matcher(url.pathname, request.method)) return undefined;
      let body: unknown;
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        try {
          body = await request.clone().json();
        } catch {
          body = undefined;
        }
      }
      captured.value = { url: request.url, method: request.method, body, headers: request.headers };
      const payload = (await reply(request)) as Parameters<typeof HttpResponse.json>[0];
      return HttpResponse.json(payload);
    }),
  );
  return { captured };
}

const okReporte = { id: 'r_xyz', nombre: 'Test', state: 'borrador' as const };

describe('m3 pr-2 · cliente HTTP', () => {
  // ----------------------------------------------------------------------
  // Inbox + listado (US-02)
  // ----------------------------------------------------------------------

  it('fetchInbox · GET / con as_user=me + filtros', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/',
      () => ({ items: [okReporte] }),
    );
    const r = await fetchInbox({ state: 'borrador', q: 'mort', page: 2, page_size: 10 });
    expect(captured.value?.method).toBe('GET');
    const u = new URL(captured.value!.url);
    expect(u.searchParams.get('as_user')).toBe('me');
    expect(u.searchParams.get('state')).toBe('borrador');
    expect(u.searchParams.get('q')).toBe('mort');
    expect(u.searchParams.get('page')).toBe('2');
    expect(u.searchParams.get('page_size')).toBe('10');
    expect(r.items).toHaveLength(1);
  });

  it('fetchCounts · GET /counts?as_user=me', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/counts',
      () => ({ total: 12, action_required: 3, by_state: { borrador: 5, iterando: 2 } }),
    );
    const r = await fetchCounts();
    expect(captured.value?.method).toBe('GET');
    expect(new URL(captured.value!.url).searchParams.get('as_user')).toBe('me');
    expect(r.total).toBe(12);
    expect(r.action_required).toBe(3);
    expect(r.by_state.borrador).toBe(5);
  });

  // ----------------------------------------------------------------------
  // CRUD (US-03)
  // ----------------------------------------------------------------------

  it('createReport · POST /', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/',
      () => okReporte,
    );
    const r = await createReport({ nombre: 'Nuevo' });
    expect(captured.value?.body).toEqual({ nombre: 'Nuevo' });
    expect(r.id).toBe('r_xyz');
  });

  it('getReport · GET /{id}', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/r_xyz',
      () => okReporte,
    );
    const r = await getReport('r_xyz');
    expect(captured.value?.method).toBe('GET');
    expect(r.id).toBe('r_xyz');
  });

  it('updateReport · PUT /{id} con If-Match quoted', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'PUT' && path === '/r_xyz',
      () => ({ ...okReporte, version: 8 }),
    );
    const r = await updateReport('r_xyz', { nombre: 'Editado' }, 7);
    expect(captured.value?.method).toBe('PUT');
    expect(captured.value?.headers?.get('If-Match')).toBe('"7"');
    expect(captured.value?.body).toEqual({ nombre: 'Editado' });
    expect(r.version).toBe(8);
  });

  // ----------------------------------------------------------------------
  // Designer (US-03)
  // ----------------------------------------------------------------------

  it('fetchDatamart · GET /datamart', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/datamart',
      () => ({ tables: [{ id: 't1', name: 'T1', kind: 'fact', fields: [] }] }),
    );
    const r = await fetchDatamart();
    expect(captured.value?.method).toBe('GET');
    expect(r.tables[0]?.kind).toBe('fact');
  });

  it('previewReport · POST /{id}/preview con definition tipada', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/preview',
      () => ({ columns: ['a'], rows: [[1]] }),
    );
    const def = { filters: [], rows: [], cols: [], values: [{ field_id: 'm', agg: 'sum' }] };
    const r = await previewReport('r_xyz', def);
    expect(captured.value?.body).toEqual({ definition: def });
    expect(r.columns).toEqual(['a']);
  });

  it('submitForValidation · POST /{id}/submit-for-validation', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/submit-for-validation',
      () => ({ ...okReporte, state: 'esperando_validacion' as const }),
    );
    const r = await submitForValidation('r_xyz');
    expect(captured.value?.method).toBe('POST');
    expect(r.state).toBe('esperando_validacion');
  });

  // ----------------------------------------------------------------------
  // Validación (US-05)
  // ----------------------------------------------------------------------

  it('validateReport · POST /{id}/validate con decision y note', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/validate',
      () => ({ ...okReporte, state: 'esperando_aprobacion' as const }),
    );
    const r = await validateReport('r_xyz', 'approve_content', 'OK contenido');
    expect(captured.value?.body).toEqual({ decision: 'approve_content', note: 'OK contenido' });
    expect(r.state).toBe('esperando_aprobacion');
  });

  // ----------------------------------------------------------------------
  // Aprobación (US-06)
  // ----------------------------------------------------------------------

  it('preflightReport · POST /{id}/preflight', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/preflight',
      () => ({
        checks: [{ id: 'pivot', label: 'Pivot', status: 'pass' as const }],
        can_approve: true,
      }),
    );
    const r = await preflightReport('r_xyz');
    expect(captured.value?.method).toBe('POST');
    expect(r.can_approve).toBe(true);
  });

  it('fetchAssignableRoles · GET /roles/assignable?report_id=', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/roles/assignable',
      () => [{ id: 'aprobador', label: 'Aprobador' }],
    );
    const r = await fetchAssignableRoles('r_xyz');
    expect(new URL(captured.value!.url).searchParams.get('report_id')).toBe('r_xyz');
    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe('aprobador');
  });

  it('approveReport · POST /{id}/approve con allowed_roles y note', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/approve',
      () => ({ ...okReporte, state: 'aprobado' as const }),
    );
    const r = await approveReport('r_xyz', ['analista', 'gerente'], 'ok');
    expect(captured.value?.body).toEqual({ allowed_roles: ['analista', 'gerente'], note: 'ok' });
    expect(r.state).toBe('aprobado');
  });

  it('publishReport · POST /{id}/publish (sin CI/CD, US-07 stand-by)', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/publish',
      () => ({ ...okReporte, state: 'publicado' as const }),
    );
    const r = await publishReport('r_xyz');
    expect(captured.value?.method).toBe('POST');
    expect(r.state).toBe('publicado');
  });

  it('delegateApproval · POST /{id}/delegate-approval con new_approver_id', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/delegate-approval',
      () => okReporte,
    );
    await delegateApproval('r_xyz', 'u_otro');
    expect(captured.value?.body).toEqual({ new_approver_id: 'u_otro' });
  });

  // ----------------------------------------------------------------------
  // Detail / bitácora / timeline (US-04)
  // ----------------------------------------------------------------------

  it('fetchTimeline · GET /{id}/timeline sin page', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/r_xyz/timeline',
      () => [{ ts: '2026-05-18T10:00:00Z', actor: 'sistema', accion: 'created' }],
    );
    const r = await fetchTimeline('r_xyz');
    expect(captured.value?.url.includes('?')).toBe(false);
    expect(r).toHaveLength(1);
    expect(r[0]?.accion).toBe('created');
  });

  it('fetchTimeline · GET /{id}/timeline?page=2', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'GET' && path === '/r_xyz/timeline',
      () => [],
    );
    await fetchTimeline('r_xyz', 2);
    expect(new URL(captured.value!.url).searchParams.get('page')).toBe('2');
  });

  it('addObservation · POST /{id}/observations con text/anchor/mentions', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/observations',
      () => ({
        id: 'obs_1',
        author: 'u',
        role: 'validador',
        text: 'falta',
        status: 'open' as const,
        created_at: '2026-05-18T10:00:00Z',
      }),
    );
    const r = await addObservation('r_xyz', {
      text: 'falta',
      anchor: 'definition.values[0]',
      mentions: ['u_creator'],
    });
    expect(captured.value?.body).toEqual({
      text: 'falta',
      anchor: 'definition.values[0]',
      mentions: ['u_creator'],
    });
    expect(r.id).toBe('obs_1');
  });

  it('resolveObservation · PATCH /{id}/observations/{obs_id} con { resolved }', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'PATCH' && path === '/r_xyz/observations/obs_1',
      () => ({
        id: 'obs_1',
        author: 'u',
        role: 'validador',
        text: 't',
        status: 'resolved' as const,
        created_at: '2026-05-18T10:00:00Z',
        resolved_at: '2026-05-18T12:00:00Z',
      }),
    );
    const r = await resolveObservation('r_xyz', 'obs_1', true);
    expect(captured.value?.method).toBe('PATCH');
    expect(captured.value?.body).toEqual({ resolved: true });
    expect(r.status).toBe('resolved');
  });

  // ----------------------------------------------------------------------
  // Retención + urgencia (US-09, US-10)
  // ----------------------------------------------------------------------

  it('markUrgent · POST /{id}/urgent con urgent y reason', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/urgent',
      () => ({ ...okReporte, urgent: true }),
    );
    const r = await markUrgent('r_xyz', true, 'auditoría inminente');
    expect(captured.value?.body).toEqual({ urgent: true, reason: 'auditoría inminente' });
    expect(r.urgent).toBe(true);
  });

  it('extendRetention · POST /{id}/extend-retention con days', async () => {
    const { captured } = captureJson(
      (path, method) => method === 'POST' && path === '/r_xyz/extend-retention',
      () => ({ ...okReporte, purge_in_days: 30 }),
    );
    const r = await extendRetention('r_xyz', 30);
    expect(captured.value?.body).toEqual({ days: 30 });
    expect(r.purge_in_days).toBe(30);
  });
});
