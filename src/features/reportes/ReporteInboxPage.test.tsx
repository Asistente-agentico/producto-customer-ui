import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReporteInboxPage from './ReporteInboxPage';
import ReporteDetailPage from './ReporteDetailPage';
import { useCapabilities } from '@/stores/capabilities';
import { server } from '@/mocks/server';

import '@/i18n';

const REPORTES_BASE = 'http://localhost:8081';

// Títulos únicos para evitar colisión con los labels de las tabs
// (queryByText matchearía tanto al item como al tab del mismo nombre).
const ITEMS_DEFAULT = [
  {
    id: 'r_borr',
    nombre: 'Mortalidad mensual',
    descripcion: 'Sin enviar',
    state: 'borrador',
    creator_id: 'u_me',
  },
  {
    id: 'r_data',
    nombre: 'Biomasa diaria',
    state: 'esperando_datos',
    creator_id: 'u_me',
  },
  {
    id: 'r_val',
    nombre: 'FCR consolidado',
    state: 'esperando_validacion',
    next_action_for: 'u_me',
    urgent: true,
  },
  {
    id: 'r_apr',
    nombre: 'Margen por SKU',
    state: 'esperando_aprobacion',
    next_action_for: 'u_otro',
  },
  {
    id: 'r_iter',
    nombre: 'Gastos operacionales',
    state: 'iterando',
    creator_id: 'u_me',
  },
  {
    id: 'r_oculto',
    nombre: 'Aprobado (sin tab)',
    state: 'aprobado',
  },
];

type CountsShape = {
  total: number;
  action_required: number;
  by_state: Record<string, number>;
};

const COUNTS_DEFAULT: CountsShape = {
  total: 5,
  action_required: 2,
  by_state: {
    borrador: 1,
    esperando_datos: 1,
    esperando_validacion: 1,
    esperando_aprobacion: 1,
    iterando: 1,
  },
};

type InboxOverrides = {
  items?: typeof ITEMS_DEFAULT;
  counts?: typeof COUNTS_DEFAULT;
  inboxRefreshSeconds?: number;
};

function installHandlers(overrides: InboxOverrides = {}) {
  let inboxCalls = 0;
  let countsCalls = 0;
  server.use(
    http.get(`${REPORTES_BASE}/`, () => {
      inboxCalls += 1;
      return HttpResponse.json({ items: overrides.items ?? ITEMS_DEFAULT });
    }),
    http.get(`${REPORTES_BASE}/counts`, () => {
      countsCalls += 1;
      return HttpResponse.json(overrides.counts ?? COUNTS_DEFAULT);
    }),
  );
  return {
    get inboxCalls() {
      return inboxCalls;
    },
    get countsCalls() {
      return countsCalls;
    },
  };
}

async function setupCapsReady(overrides: InboxOverrides = {}) {
  useCapabilities.getState().clear();
  await useCapabilities.getState().load();
  const caps = useCapabilities.getState().capabilities;
  if (!caps) throw new Error('capabilities no cargadas');
  const reportesActual = caps.modulos.reportes as Record<string, unknown> | undefined;
  useCapabilities.setState({
    capabilities: {
      ...caps,
      usuario: { ...caps.usuario, id_pseudo: 'u_me', permisos: ['crear_reporte'] },
      modulos: {
        ...caps.modulos,
        reportes: {
          ...(reportesActual ?? { enabled: true, base_url: REPORTES_BASE }),
          inbox:
            overrides.inboxRefreshSeconds !== undefined
              ? { refresh_interval_seconds: overrides.inboxRefreshSeconds }
              : undefined,
        } as never,
      },
    },
  });
}

function wrap(initial = '/reportes/inbox') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/reportes/inbox" element={<ReporteInboxPage />} />
          <Route path="/reportes/:id" element={<ReporteDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useCapabilities.getState().clear();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReporteInboxPage · US-02 (m3 pr-5)', () => {
  it('renderiza las 4 tabs por estado con conteos', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    expect(await screen.findByRole('tab', { name: /borradores/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /en validación/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /esperando aprobación/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /iterando/i })).toBeInTheDocument();
  });

  it('muestra contadores derivados de fetchCounts (Borradores = borrador + esperando_datos)', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    // Esperar a que el query de counts haya resuelto: el badge del tab
    // Borradores debe contener "2" (1 borrador + 1 esperando_datos).
    const borradoresTab = await screen.findByRole('tab', { name: /borradores/i });
    await waitFor(() => expect(borradoresTab).toHaveTextContent('2'));

    // El chip "Te tocan" del strip refleja action_required.
    expect(screen.getByText(/te tocan/i)).toBeInTheDocument();
  });

  it('por default la tab Borradores muestra items en estado borrador + esperando_datos', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    expect(await screen.findByText('Mortalidad mensual')).toBeInTheDocument();
    expect(screen.getByText('Biomasa diaria')).toBeInTheDocument();
    // Items de otras tabs NO se muestran.
    expect(screen.queryByText('FCR consolidado')).not.toBeInTheDocument();
  });

  it('click en otra tab filtra la lista por estado', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    await screen.findByText('Mortalidad mensual');
    fireEvent.click(screen.getByRole('tab', { name: /en validación/i }));

    expect(await screen.findByText('FCR consolidado')).toBeInTheDocument();
    expect(screen.queryByText('Mortalidad mensual')).not.toBeInTheDocument();
  });

  it('muestra indicador "Te toca" para items donde next_action_for === id_pseudo', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    fireEvent.click(await screen.findByRole('tab', { name: /en validación/i }));
    // El item r_val tiene next_action_for: 'u_me'.
    expect(await screen.findAllByText(/^te toca$/i)).not.toHaveLength(0);
  });

  it('NO muestra "Te toca" cuando next_action_for apunta a otro usuario', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    fireEvent.click(await screen.findByRole('tab', { name: /esperando aprobación/i }));
    await screen.findByText('Margen por SKU');
    // No hay badges "Te toca" en esta vista (r_apr → u_otro).
    expect(screen.queryByText(/^te toca$/i)).not.toBeInTheDocument();
  });

  it('muestra empty state cuando no hay items en la tab activa', async () => {
    installHandlers({ items: [], counts: { ...COUNTS_DEFAULT, by_state: {} } });
    await setupCapsReady();
    wrap();

    expect(await screen.findByText(/sin reportes en esta categoría/i)).toBeInTheDocument();
  });

  it('click en un item navega a /reportes/{id} (stub Detail)', async () => {
    installHandlers();
    await setupCapsReady();
    wrap();

    const link = await screen.findByRole('link', { name: /mortalidad mensual/i });
    expect(link).toHaveAttribute('href', '/reportes/r_borr');
    fireEvent.click(link);

    expect(await screen.findByText(/detail en construcción · pr 7/i)).toBeInTheDocument();
  });

  it('oculta el bridge "+ Crear reporte" si el usuario no tiene crear_reporte', async () => {
    installHandlers();
    await setupCapsReady();
    // Quitar el permiso.
    const caps = useCapabilities.getState().capabilities;
    if (caps) {
      useCapabilities.setState({
        capabilities: { ...caps, usuario: { ...caps.usuario, permisos: [] } },
      });
    }
    wrap();

    await screen.findByText('Mortalidad mensual');
    expect(screen.queryByRole('link', { name: /crear reporte/i })).not.toBeInTheDocument();
  });

  it('polling refetch al avanzar 30s (default)', async () => {
    const handlers = installHandlers();
    await setupCapsReady();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wrap();

    await screen.findByText('Mortalidad mensual');
    const initialCalls = handlers.inboxCalls;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(31_000);
    await waitFor(() => expect(handlers.inboxCalls).toBeGreaterThan(initialCalls));
  });

  it('respeta capabilities.modulos.reportes.inbox.refresh_interval_seconds = 5', async () => {
    const handlers = installHandlers();
    await setupCapsReady({ inboxRefreshSeconds: 5 });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wrap();

    await screen.findByText('Mortalidad mensual');
    const initialCalls = handlers.inboxCalls;
    // A 4s todavía no debe haber refetch (sumando margen).
    await vi.advanceTimersByTimeAsync(4_000);
    expect(handlers.inboxCalls).toBe(initialCalls);
    // A los 6s sí.
    await vi.advanceTimersByTimeAsync(2_500);
    await waitFor(() => expect(handlers.inboxCalls).toBeGreaterThan(initialCalls));
  });
});
