import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ArtefactDispatcher from './ArtefactDispatcher';
import type { Artefacto } from '@/api/types';

import '@/i18n';

function wrap(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ArtefactDispatcher', () => {
  it('renderiza banner con role note/alert', async () => {
    const a: Artefacto = {
      tipo: 'banner',
      version: 1,
      variante: 'info',
      mensaje: 'Mensaje informativo',
    };
    wrap(<ArtefactDispatcher artefacto={a} />);
    expect(await screen.findByText('Mensaje informativo')).toBeInTheDocument();
  });

  it('renderiza tabla con headers', async () => {
    const a: Artefacto = {
      tipo: 'tabla',
      version: 1,
      titulo: 'Líneas',
      columnas: [
        { id: 'linea_id', label: 'Línea', tipo: 'string' },
        { id: 'volumen', label: 'Volumen', tipo: 'number' },
      ],
      filas: [{ linea_id: 'LIN-001', volumen: 850 }],
    };
    wrap(<ArtefactDispatcher artefacto={a} />);
    expect(await screen.findByText('Líneas')).toBeInTheDocument();
    expect(screen.getByText('LIN-001')).toBeInTheDocument();
  });

  it('renderiza KPI bloqueado con mensaje', async () => {
    const a: Artefacto = {
      tipo: 'tablero_kpi',
      version: 1,
      kpis: [
        {
          id: 'k1',
          etiqueta: 'Costo',
          bloqueado: true,
          mensaje: 'Sin permisos',
        },
      ],
    };
    wrap(<ArtefactDispatcher artefacto={a} />);
    expect(await screen.findByText('Sin permisos')).toBeInTheDocument();
  });

  it('renderiza placeholder para artefacto desconocido', async () => {
    const a: Artefacto = {
      tipo: 'desconocido',
      _raw: { tipo: 'futuro' },
      _reason: 'tipo_no_reconocido',
    };
    wrap(<ArtefactDispatcher artefacto={a} />);
    expect(await screen.findByText(/no reconocido|Unknown|não reconhecido/i)).toBeInTheDocument();
  });
});
