import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccionPropuestaCard from './AccionPropuestaCard';
import type { Artefacto } from '@/api/types';

function wrap(node: React.ReactNode, initial = '/chat/conv1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/chat/:conversacionId" element={node} />
          <Route path="/acciones/:id" element={<div data-testid="acciones-route" />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const accionCorreo = {
  tipo: 'accion_propuesta',
  version: 1,
  tipo_accion: 'ENVIAR_CORREO',
  id_propuesta: 'act_xyz',
  titulo: 'Notificar a Hugo',
  sub: 'Para hugo@cliente.cl',
  parametros: { destinatario: 'hugo@cliente.cl' },
  permite_edicion: ['destinatario'],
} satisfies Artefacto;

const accionAgente = {
  tipo: 'accion_propuesta',
  version: 1,
  tipo_accion: 'AGENTE_IA',
  id_propuesta: 'act_agt',
  titulo: 'Disparar aireadores',
  parametros: { linea_id: 'LIN-007' },
  permite_edicion: [],
  permiso_requerido: 'disparar_agente_aireadores',
} satisfies Artefacto;

describe('AccionPropuestaCard v2 · stub navegable (Q5)', () => {
  it('renderiza correo: título + destinatario + botón "Revisar en panel"', () => {
    wrap(<AccionPropuestaCard artefacto={accionCorreo} conversacionId="conv1" />);
    expect(screen.getByText('Notificar a Hugo')).toBeInTheDocument();
    expect(screen.getByText(/hugo@cliente\.cl/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revisar en panel/i })).toBeInTheDocument();
  });

  it('renderiza AGENTE_IA con permiso_requerido en el sub', () => {
    wrap(<AccionPropuestaCard artefacto={accionAgente} conversacionId="conv1" />);
    expect(screen.getByText(/disparar_agente_aireadores/)).toBeInTheDocument();
  });

  it('Q5 · click navega a /acciones/:id_propuesta', () => {
    wrap(<AccionPropuestaCard artefacto={accionCorreo} conversacionId="conv1" />);
    fireEvent.click(screen.getByRole('button', { name: /revisar en panel/i }));
    expect(screen.getByTestId('acciones-route')).toBeInTheDocument();
  });

  it('Q4 · no muestra badge de riesgo (eliminado del shape v2)', () => {
    wrap(<AccionPropuestaCard artefacto={accionCorreo} conversacionId="conv1" />);
    expect(screen.queryByText(/riesgo/i)).not.toBeInTheDocument();
  });

  it('Q4 · no muestra parámetros editables inline (eso vive en /acciones)', () => {
    wrap(<AccionPropuestaCard artefacto={accionCorreo} conversacionId="conv1" />);
    // No hay textarea ni inputs.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descartar/i })).not.toBeInTheDocument();
  });
});

// Silenciar warnings de router en tests.
vi.spyOn(console, 'warn').mockImplementation(() => {
  // intentionally muted
});
