import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KpiBand from './KpiBand';
import { useUiToggles } from '@/stores/uiToggles';
import { useCapabilities } from '@/stores/capabilities';
import { useKpis } from '@/stores/kpis';

beforeEach(() => {
  useUiToggles.getState().closeAll();
  useKpis.getState().clear();
  localStorage.clear();
});

async function setupCapsReady() {
  useCapabilities.getState().clear();
  await useCapabilities.getState().load();
}

describe('KpiBand · PR 5', () => {
  it('no renderiza si el toggle está OFF', async () => {
    await setupCapsReady();
    const { container } = render(<KpiBand />);
    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza si el módulo KPIs no está habilitado', async () => {
    await setupCapsReady();
    useUiToggles.getState().setKpiBand(true);
    // Forzar módulo deshabilitado.
    const caps = useCapabilities.getState().capabilities;
    if (caps) {
      useCapabilities.setState({
        capabilities: {
          ...caps,
          modulos: { ...caps.modulos, kpis: { enabled: false } },
        },
      });
    }
    const { container } = render(<KpiBand />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza 5 KPIs configurados cuando toggle ON', async () => {
    await setupCapsReady();
    useUiToggles.getState().setKpiBand(true);
    render(<KpiBand />);
    // Cada KPI tiene un botón tile con aria-pressed (5 total).
    const tiles = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') !== null);
    expect(tiles).toHaveLength(5);
  });

  function findTileButton(matcher: RegExp): HTMLElement {
    // Los KPI tiles tienen aria-label "${label} ${value}"; los botones
    // "Cerrar X" del detail también matchean por nombre. Filtramos por
    // los que tienen aria-pressed (solo los tiles).
    const all = screen.getAllByRole('button', { name: matcher });
    const tile = all.find((b) => b.getAttribute('aria-pressed') !== null);
    if (!tile) throw new Error(`Tile no encontrado para ${matcher}`);
    return tile;
  }

  it('click en un KPI lo expande mostrando stats', async () => {
    await setupCapsReady();
    useUiToggles.getState().setKpiBand(true);
    render(<KpiBand />);
    const btn = findTileButton(/Defectos diarios/i);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    // Stat "acumulado 14d" aparece (del fixture).
    expect(screen.getByText(/acumulado 14d/i)).toBeInTheDocument();
  });

  it('múltiples KPIs pueden expandirse simultáneamente', async () => {
    await setupCapsReady();
    useUiToggles.getState().setKpiBand(true);
    render(<KpiBand />);
    fireEvent.click(findTileButton(/Defectos diarios/i));
    fireEvent.click(findTileButton(/Parámetro crítico/i));
    expect(findTileButton(/Defectos diarios/i)).toHaveAttribute('aria-pressed', 'true');
    expect(findTileButton(/Parámetro crítico/i)).toHaveAttribute('aria-pressed', 'true');
  });

  it('botón ✕ cierra la banda (sincroniza con TopBar toggle)', async () => {
    await setupCapsReady();
    useUiToggles.getState().setKpiBand(true);
    render(<KpiBand />);
    const cerrar = screen.getByLabelText(/Cerrar banda de KPIs/i);
    fireEvent.click(cerrar);
    expect(useUiToggles.getState().kpiBandOpen).toBe(false);
  });

  it('SSE override · si llega valor live, prefiere ese sobre el snapshot', async () => {
    await setupCapsReady();
    useUiToggles.getState().setKpiBand(true);
    useKpis.getState().apply({ kpi_id: 'def', valor: '99 u/d' });
    render(<KpiBand />);
    expect(screen.getByText('99 u/d')).toBeInTheDocument();
    // El valor del fixture "27 u/d" ya no aparece.
    expect(screen.queryByText('27 u/d')).not.toBeInTheDocument();
  });
});
