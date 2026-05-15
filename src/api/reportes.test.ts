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
