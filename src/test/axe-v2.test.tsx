// PR 11 · Pasada de axe-core sobre los componentes nuevos del v2.0
// (handoff Final §10 marca WCAG 2.1 AA como mínimo). Centralizados en
// un solo file para acelerar el setup compartido.

import { beforeEach, describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expectNoAxeViolations } from './axe';
import { useCapabilities } from '@/stores/capabilities';
import { useUiToggles } from '@/stores/uiToggles';
import { useKpis } from '@/stores/kpis';

import BootstrapSplash from '@/features/bootstrap/BootstrapSplash';
import ModulosPreview from '@/features/auth/ModulosPreview';
import KpiBand from '@/features/kpis/KpiBand';
import AccionPropuestaCard from '@/artifacts/AccionPropuestaCard';
import type { Artefacto } from '@/api/types';

import '@/i18n';

function wrap(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  useCapabilities.getState().clear();
  useUiToggles.getState().closeAll();
  useKpis.getState().clear();
  localStorage.clear();
  await useCapabilities.getState().load();
});

describe('Axe v2 · componentes nuevos', () => {
  it('BootstrapSplash sin violations en estado inicial', async () => {
    const steps: Array<{
      id: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      status: 'pending' | 'in_progress' | 'done';
    }> = [
      { id: 1, status: 'done' },
      { id: 2, status: 'done' },
      { id: 3, status: 'in_progress' },
      { id: 4, status: 'pending' },
      { id: 5, status: 'pending' },
      { id: 6, status: 'pending' },
      { id: 7, status: 'pending' },
    ];
    const { container } = wrap(<BootstrapSplash steps={steps} />);
    await expectNoAxeViolations(container);
  });

  it('ModulosPreview (login) sin violations', async () => {
    const { container } = wrap(<ModulosPreview />);
    await expectNoAxeViolations(container);
  });

  it('KpiBand expandido con un KPI sin violations', async () => {
    useUiToggles.getState().setKpiBand(true);
    const { container } = wrap(<KpiBand />);
    await expectNoAxeViolations(container);
  });

  it('AccionPropuestaCard stub (correo) sin violations', async () => {
    const stub = {
      tipo: 'accion_propuesta',
      version: 1,
      tipo_accion: 'ENVIAR_CORREO',
      id_propuesta: 'act_xyz',
      titulo: 'Notificar a Hugo',
      sub: 'Para hugo@x.com',
      parametros: { destinatario: 'hugo@x.com' },
      permite_edicion: [],
    } satisfies Artefacto;
    const { container } = wrap(<AccionPropuestaCard artefacto={stub} conversacionId="c1" />);
    await expectNoAxeViolations(container);
  });

  it('AccionPropuestaCard stub (agente con permiso_requerido) sin violations', async () => {
    const stub = {
      tipo: 'accion_propuesta',
      version: 1,
      tipo_accion: 'AGENTE_IA',
      id_propuesta: 'act_agt',
      titulo: 'Disparar aireadores',
      parametros: {},
      permite_edicion: [],
      permiso_requerido: 'disparar_agente_aireadores',
    } satisfies Artefacto;
    const { container } = wrap(<AccionPropuestaCard artefacto={stub} conversacionId="c1" />);
    await expectNoAxeViolations(container);
  });
});
