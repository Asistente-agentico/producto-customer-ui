import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';
import { auditEvent } from '@/api/audit';

import '@/i18n';

// Saltarse el BootstrapSplash en tests: el hook computa pasos async
// con efectos sobre stores. Forzar `allDone: true` mantiene el test
// enfocado en la lógica de `requirePerm`.
vi.mock('@/features/bootstrap/useBootstrapSteps', () => ({
  useBootstrapSteps: () => ({ steps: [], allDone: true }),
}));

// Espía sobre auditEvent — debe dispararse con `permission_denied`
// cuando el redirect ocurra, y NO dispararse cuando el permiso esté
// presente.
vi.mock('@/api/audit', () => ({
  auditEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockedAuditEvent = vi.mocked(auditEvent);

function buildCaps(permisos: string[]) {
  return {
    version: '1.0',
    ui: {},
    tenant: { id: 'demo' },
    usuario: {
      id_pseudo: 'u1',
      rol: 'analista',
      gerencia: 'Operaciones',
      permisos,
    },
    modulos: {
      central: { enabled: true },
    },
  } as never;
}

function setupAuthenticated(permisos: string[]) {
  useAuth.setState({
    status: 'authenticated',
    user: { id_pseudo: 'u1', rol: 'analista', permisos } as never,
  });
  useCapabilities.setState({
    capabilities: buildCaps(permisos),
    fetchedAt: Date.now(),
    status: 'ready',
    errorMessage: null,
  });
}

function wrap(
  children: React.ReactNode,
  initial = '/protegida',
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/protegida" element={children} />
          <Route path="/fallback" element={<div data-testid="fallback-route">fallback</div>} />
          <Route path="/reportes" element={<div data-testid="reportes-route">reportes</div>} />
          <Route path="/" element={<div data-testid="home-route">home</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.setState({ status: 'unknown', user: null });
  useCapabilities.getState().clear();
  localStorage.clear();
  mockedAuditEvent.mockClear();
});

describe('ProtectedRoute · requirePerm (m3 pr-3)', () => {
  it('sin `requirePerm` renderiza children cuando auth + bootstrap están OK', async () => {
    setupAuthenticated(['consultar']);
    wrap(
      <ProtectedRoute>
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );
    expect(await screen.findByTestId('contenido-protegido')).toBeInTheDocument();
    expect(mockedAuditEvent).not.toHaveBeenCalled();
  });

  it('con `requirePerm` string presente en el usuario, renderiza children', async () => {
    setupAuthenticated(['consultar', 'crear_reporte']);
    wrap(
      <ProtectedRoute requirePerm="crear_reporte" denyRedirectTo="/reportes">
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );
    expect(await screen.findByTestId('contenido-protegido')).toBeInTheDocument();
    expect(mockedAuditEvent).not.toHaveBeenCalled();
  });

  it('con `requirePerm` string ausente, redirige a `denyRedirectTo` y dispara audit', async () => {
    setupAuthenticated(['consultar']);
    wrap(
      <ProtectedRoute requirePerm="crear_reporte" denyRedirectTo="/reportes">
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );

    expect(await screen.findByTestId('reportes-route')).toBeInTheDocument();
    expect(screen.queryByTestId('contenido-protegido')).not.toBeInTheDocument();

    await waitFor(() => expect(mockedAuditEvent).toHaveBeenCalledTimes(1));
    expect(mockedAuditEvent).toHaveBeenCalledWith({
      evento: 'permission_denied',
      recurso: '/protegida',
      metadata: { required: ['crear_reporte'], denegados: ['crear_reporte'], match: 'all' },
    });
  });

  it('con `requirePerm` array y todos presentes (AND), renderiza children', async () => {
    setupAuthenticated(['perm_a', 'perm_b', 'consultar']);
    wrap(
      <ProtectedRoute requirePerm={['perm_a', 'perm_b']} denyRedirectTo="/fallback">
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );
    expect(await screen.findByTestId('contenido-protegido')).toBeInTheDocument();
    expect(mockedAuditEvent).not.toHaveBeenCalled();
  });

  it('con `requirePerm` array y falta alguno, redirige y audita los denegados', async () => {
    setupAuthenticated(['perm_a']);
    wrap(
      <ProtectedRoute requirePerm={['perm_a', 'perm_b']} denyRedirectTo="/fallback">
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );

    expect(await screen.findByTestId('fallback-route')).toBeInTheDocument();
    expect(screen.queryByTestId('contenido-protegido')).not.toBeInTheDocument();

    await waitFor(() => expect(mockedAuditEvent).toHaveBeenCalledTimes(1));
    expect(mockedAuditEvent).toHaveBeenCalledWith({
      evento: 'permission_denied',
      recurso: '/protegida',
      metadata: { required: ['perm_a', 'perm_b'], denegados: ['perm_b'], match: 'all' },
    });
  });

  it('con `permMatch="any"` y al menos uno presente, renderiza children', async () => {
    setupAuthenticated(['perm_b']);
    wrap(
      <ProtectedRoute
        requirePerm={['perm_a', 'perm_b', 'perm_c']}
        permMatch="any"
        denyRedirectTo="/fallback"
      >
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );
    expect(await screen.findByTestId('contenido-protegido')).toBeInTheDocument();
    expect(mockedAuditEvent).not.toHaveBeenCalled();
  });

  it('con `permMatch="any"` y ninguno presente, redirige + audita con match=any', async () => {
    setupAuthenticated(['otro_perm']);
    wrap(
      <ProtectedRoute
        requirePerm={['perm_a', 'perm_b']}
        permMatch="any"
        denyRedirectTo="/fallback"
      >
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );

    expect(await screen.findByTestId('fallback-route')).toBeInTheDocument();
    expect(screen.queryByTestId('contenido-protegido')).not.toBeInTheDocument();

    await waitFor(() => expect(mockedAuditEvent).toHaveBeenCalledTimes(1));
    expect(mockedAuditEvent).toHaveBeenCalledWith({
      evento: 'permission_denied',
      recurso: '/protegida',
      metadata: {
        required: ['perm_a', 'perm_b'],
        denegados: ['perm_a', 'perm_b'],
        match: 'any',
      },
    });
  });

  it('sin `denyRedirectTo`, usa `/` por default al denegar', async () => {
    setupAuthenticated([]);
    wrap(
      <ProtectedRoute requirePerm="crear_reporte">
        <div data-testid="contenido-protegido">ok</div>
      </ProtectedRoute>,
    );
    expect(await screen.findByTestId('home-route')).toBeInTheDocument();
  });
});
