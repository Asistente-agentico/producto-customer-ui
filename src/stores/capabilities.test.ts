import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { appConfig } from '@/lib/config';
import { useCapabilities, applyCapabilities } from './capabilities';
import { capabilitiesFixture } from '@/mocks/fixtures/capabilities';

const base = appConfig.BACKEND_URL_CENTRAL;

beforeEach(() => {
  useCapabilities.getState().clear();
  localStorage.clear();
  // Reset CSS vars y title antes de cada test.
  document.documentElement.removeAttribute('style');
  document.title = '';
});

describe('useCapabilities store', () => {
  it('carga capabilities y deja status=ready', async () => {
    await useCapabilities.getState().load();
    const state = useCapabilities.getState();
    expect(state.status).toBe('ready');
    expect(state.capabilities?.tenant.id).toBe(capabilitiesFixture.tenant.id);
  });

  it('queda en degraded si /capabilities falla y no había cache', async () => {
    server.use(
      http.get(`${base}/capabilities`, () =>
        HttpResponse.json(
          { error: { code: 'BACKEND_DOWN', message: 'sin servicio' } },
          { status: 502 },
        ),
      ),
    );
    await useCapabilities.getState().refresh();
    expect(useCapabilities.getState().status).toBe('degraded');
    expect(useCapabilities.getState().errorMessage).toBeTruthy();
  });

  it('mantiene caps previos si falla refresh teniendo cache', async () => {
    await useCapabilities.getState().load();
    expect(useCapabilities.getState().status).toBe('ready');
    server.use(
      http.get(`${base}/capabilities`, () =>
        HttpResponse.json(
          { error: { code: 'MAINTENANCE', message: 'mantenimiento' } },
          { status: 503 },
        ),
      ),
    );
    await useCapabilities.getState().refresh();
    expect(useCapabilities.getState().status).toBe('ready');
    expect(useCapabilities.getState().capabilities).not.toBeNull();
  });
});

describe('applyCapabilities', () => {
  it('aplica CSS vars de colores legacy (alias v1)', () => {
    applyCapabilities(capabilitiesFixture);
    const style = document.documentElement.style;
    // El fixture v2 trae ambas paletas; las legacy quedan setteadas
    // desde la rama v2 (que las mapea), no desde la rama v1.
    expect(style.getPropertyValue('--color-primary')).toBe(capabilitiesFixture.ui.colores!.paper);
    expect(style.getPropertyValue('--color-sidebar')).toBe(capabilitiesFixture.ui.colores!.navy);
    expect(style.getPropertyValue('--color-accent')).toBe(capabilitiesFixture.ui.colores!.coral);
  });

  it('aplica titulo al document.title', () => {
    applyCapabilities(capabilitiesFixture);
    expect(document.title).toBe(capabilitiesFixture.ui.titulo);
  });

  it('PR 0 · aplica paleta v2.0 (navy/coral/paper/cream)', () => {
    applyCapabilities(capabilitiesFixture);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-navy')).toBe('#0A2540');
    expect(style.getPropertyValue('--color-coral')).toBe('#E85C3C');
    expect(style.getPropertyValue('--color-paper')).toBe('#FAFAF7');
    expect(style.getPropertyValue('--color-cream')).toBe('#F2EEDF');
    expect(style.getPropertyValue('--color-cream-band')).toBe('#FFFCF5');
  });

  it('PR 0 · paleta v2 sobreescribe vars legacy', () => {
    applyCapabilities(capabilitiesFixture);
    const style = document.documentElement.style;
    // --color-sidebar debe valer navy (no el alias sidebar=primario que
    // está hardcodeado en el fixture). Verificamos que v2 ganó.
    expect(style.getPropertyValue('--color-sidebar')).toBe('#0A2540');
  });

  it('PR 0 · paleta v1 sola (sin campos v2) sigue funcionando', () => {
    const legacyCaps = {
      ...capabilitiesFixture,
      ui: {
        ...capabilitiesFixture.ui,
        colores: {
          primario: '#abcabc',
          sidebar: '#123456',
          acento: '#deadbe',
        },
      },
    };
    applyCapabilities(legacyCaps);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-primary')).toBe('#abcabc');
    expect(style.getPropertyValue('--color-sidebar')).toBe('#123456');
    expect(style.getPropertyValue('--color-accent')).toBe('#deadbe');
    expect(style.getPropertyValue('--color-navy')).toBe('');
  });
});

describe('PR 0 · campos nuevos del schema v2.0', () => {
  it('parsea email_institucional, idioma y filtros_jwt en usuario', async () => {
    await useCapabilities.getState().load();
    const u = useCapabilities.getState().capabilities?.usuario;
    expect(u?.email_institucional).toBe('matias.vergara@demo-salmonera.cl');
    expect(u?.idioma).toBe('es');
    expect(u?.filtros_jwt?.length).toBeGreaterThan(0);
    expect(u?.bloqueados?.length).toBeGreaterThan(0);
    expect(u?.kpis_configurados?.length).toBe(5);
  });

  it('parsea asistente_activo y ambitos_autorizados top-level', async () => {
    await useCapabilities.getState().load();
    const caps = useCapabilities.getState().capabilities;
    expect(caps?.asistente_activo?.id).toBe('engorda');
    expect(caps?.asistente_activo?.version).toBe('v2.4.1');
    expect(caps?.ambitos_autorizados?.map((a) => a.id)).toEqual([
      'mortalidad',
      'calidad_agua',
      'productividad',
    ]);
  });

  it('parsea tenant.dominio y tenant.region', async () => {
    await useCapabilities.getState().load();
    const t = useCapabilities.getState().capabilities?.tenant;
    expect(t?.dominio).toBe('demo-salmonera.cl');
    expect(t?.region).toBe('Región X · Los Lagos');
  });

  it('parsea modulos.ml con enabled false (no licenciado)', async () => {
    await useCapabilities.getState().load();
    const m = useCapabilities.getState().capabilities?.modulos;
    expect(m?.ml?.enabled).toBe(false);
  });
});
