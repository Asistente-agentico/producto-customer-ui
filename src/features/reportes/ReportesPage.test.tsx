import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReportesPage from './ReportesPage';
import ReportesDesignerPage from './ReportesDesignerPage';
import { useCapabilities } from '@/stores/capabilities';

import '@/i18n';

beforeEach(() => {
  useCapabilities.getState().clear();
  localStorage.clear();
});

async function setupCapsReady() {
  useCapabilities.getState().clear();
  await useCapabilities.getState().load();
}

function overridePermisos(permisos: string[]) {
  const caps = useCapabilities.getState().capabilities;
  if (!caps) throw new Error('capabilities no cargadas');
  useCapabilities.setState({
    capabilities: {
      ...caps,
      usuario: { ...caps.usuario, permisos },
    },
  });
}

function wrap(node: React.ReactNode, initial = '/reportes') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/reportes" element={node} />
          <Route path="/reportes/crear" element={<ReportesDesignerPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ReportesPage · bridge "+ Crear reporte" (m3 pr-4)', () => {
  it('muestra el botón "Crear reporte" cuando el usuario tiene el permiso `crear_reporte`', async () => {
    await setupCapsReady();
    overridePermisos(['consultar', 'crear_reporte']);

    wrap(<ReportesPage />);

    const link = await screen.findByRole('link', { name: /crear reporte/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/reportes/crear');
  });

  it('oculta el botón "Crear reporte" cuando el usuario NO tiene el permiso', async () => {
    await setupCapsReady();
    overridePermisos(['consultar']);

    wrap(<ReportesPage />);

    // Esperar a que el componente termine de renderizar el catálogo
    // (los items del fixture o el filtro segmentado).
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /todos/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /crear reporte/i })).not.toBeInTheDocument();
  });

  it('navega al stub Designer al hacer click en "Crear reporte"', async () => {
    await setupCapsReady();
    overridePermisos(['consultar', 'crear_reporte']);

    wrap(<ReportesPage />);

    const link = await screen.findByRole('link', { name: /crear reporte/i });
    fireEvent.click(link);

    expect(await screen.findByText(/designer en construcción · pr 6/i)).toBeInTheDocument();
  });
});
