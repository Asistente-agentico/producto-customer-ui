import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BannerCard from './BannerCard';
import TableroKpiCard from './TableroKpiCard';
import UnknownArtifactPlaceholder from './UnknownArtifactPlaceholder';
import { expectNoAxeViolations } from '@/test/axe';

import '@/i18n';

function wrap(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Axe: artefactos críticos sin violaciones', () => {
  it('BannerCard variante error', async () => {
    const { container } = wrap(
      <BannerCard
        artefacto={{
          tipo: 'banner',
          version: 1,
          variante: 'error',
          mensaje: 'Algo salió mal',
        }}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('TableroKpiCard con KPI bloqueado', async () => {
    const { container } = wrap(
      <TableroKpiCard
        artefacto={{
          tipo: 'tablero_kpi',
          version: 1,
          titulo: 'Resumen',
          kpis: [
            {
              id: 'k1',
              etiqueta: 'Volumen',
              valor: '2.450 t',
              color: 'verde',
              delta: '+6%',
              delta_tipo: 'positivo',
            },
            { id: 'k2', etiqueta: 'Costo', bloqueado: true, mensaje: 'Sin permisos' },
          ],
        }}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('UnknownArtifactPlaceholder', async () => {
    const { container } = wrap(
      <UnknownArtifactPlaceholder
        artefacto={{
          tipo: 'desconocido',
          _raw: { tipo: 'futuro' },
          _reason: 'tipo_no_reconocido',
        }}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
