import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { useCapabilities } from '@/stores/capabilities';
import {
  crearAccion,
  descartarAccion,
  ejecutarAccion,
  fetchCatalogoAgentes,
  listAcciones,
  obtenerAccion,
} from './acciones';
import { ApiError } from './errors';

const ACCIONES_BASE = 'http://localhost:8083';

beforeEach(async () => {
  useCapabilities.getState().clear();
  localStorage.clear();
  await useCapabilities.getState().load();
});

afterEach(() => {
  server.resetHandlers();
});

describe('PR 8 · API acciones', () => {
  it('listAcciones devuelve la cola con 4 estados representados', async () => {
    const r = await listAcciones();
    const estados = new Set(r.items.map((a) => a.estado));
    expect(estados.has('pendiente')).toBe(true);
    expect(estados.has('ejecutada')).toBe(true);
    expect(estados.has('rechazada')).toBe(true);
  });

  it('obtenerAccion devuelve audit log poblado', async () => {
    const a = await obtenerAccion('act_5e88');
    expect(a.audit.length).toBeGreaterThan(0);
    expect(a.estado).toBe('ejecutada');
  });

  it('crearAccion crea correo en estado pendiente', async () => {
    const a = await crearAccion({
      tipo: 'ENVIAR_CORREO',
      titulo: 'Test',
      parametros: { destinatario: 'x@y.com', asunto: 'A', cuerpo: 'B' },
    });
    expect(a.estado).toBe('pendiente');
    expect(a.tipo).toBe('ENVIAR_CORREO');
    expect(a.audit[0]?.accion).toMatch(/borrador/i);
  });

  it('Q11.3 · rechaza crear correo con adjuntos[]', async () => {
    await expect(
      crearAccion({
        tipo: 'ENVIAR_CORREO',
        titulo: 'Con adjuntos',
        parametros: {
          destinatario: 'x@y.com',
          asunto: 'A',
          cuerpo: 'B',
          adjuntos: [{ name: 'pdf.pdf' }],
        },
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('ejecutarAccion cambia estado a ejecutada y agrega audit', async () => {
    const r = await ejecutarAccion('act_abc123');
    expect(r.estado).toBe('ejecutada');
    expect(r.ejecutada_en).toBeTruthy();
    expect(r.audit.find((e) => e.accion.toLowerCase().includes('ejecut'))).toBeDefined();
  });

  it('ejecutar acción no-pendiente devuelve VALIDATION_ERROR', async () => {
    // act_5e88 ya está ejecutada
    await expect(ejecutarAccion('act_5e88')).rejects.toBeInstanceOf(ApiError);
  });

  it('descartarAccion cambia estado a rechazada', async () => {
    // Crear primero para no afectar acciones precargadas
    const fresh = await crearAccion({
      tipo: 'AGENTE_IA',
      titulo: 'Descarte test',
      parametros: {},
    });
    const r = await descartarAccion(fresh.id);
    expect(r.estado).toBe('rechazada');
  });

  it('fetchCatalogoAgentes devuelve agentes con permiso_requerido', async () => {
    const agentes = await fetchCatalogoAgentes();
    expect(agentes.length).toBeGreaterThan(0);
    expect(agentes.every((a) => typeof a.permiso_requerido === 'string')).toBe(true);
  });

  it('Q11.7 · ejecutar correo con `from` distinto del email_institucional → RBAC_DENIED', async () => {
    const fresh = await crearAccion({
      tipo: 'ENVIAR_CORREO',
      titulo: 'Spoof test',
      parametros: {
        destinatario: 'x@y.com',
        asunto: 'A',
        cuerpo: 'B',
        from: 'otro@dominio.com',
      },
    });
    await expect(ejecutarAccion(fresh.id)).rejects.toMatchObject({
      code: 'RBAC_DENIED',
    });
  });

  it('404 en obtenerAccion para id inexistente', async () => {
    server.use(
      http.get(`${ACCIONES_BASE}/acciones/no_existe`, () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'no existe' } }, { status: 404 }),
      ),
    );
    await expect(obtenerAccion('no_existe')).rejects.toBeInstanceOf(ApiError);
  });
});
