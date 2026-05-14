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
  it('aplica CSS vars de colores', () => {
    applyCapabilities(capabilitiesFixture);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-primary')).toBe(
      capabilitiesFixture.ui.colores!.primario,
    );
    expect(style.getPropertyValue('--color-sidebar')).toBe(capabilitiesFixture.ui.colores!.sidebar);
    expect(style.getPropertyValue('--color-accent')).toBe(capabilitiesFixture.ui.colores!.acento);
  });

  it('aplica titulo al document.title', () => {
    applyCapabilities(capabilitiesFixture);
    expect(document.title).toBe(capabilitiesFixture.ui.titulo);
  });
});
