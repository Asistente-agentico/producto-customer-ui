import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKpis } from './kpis';

beforeEach(() => {
  useKpis.setState({
    values: {},
    connected: false,
    lastAnnouncedAt: 0,
    announceBuffer: [],
  });
  vi.useFakeTimers();
});

describe('useKpis store', () => {
  it('apply guarda el valor por kpi_id', () => {
    useKpis.getState().apply({ kpi_id: 'biomasa_total', valor: '2.450 t' });
    expect(useKpis.getState().values['biomasa_total']?.valor).toBe('2.450 t');
  });

  it('apply actualiza valor existente', () => {
    useKpis.getState().apply({ kpi_id: 'biomasa_total', valor: '2.400 t' });
    useKpis.getState().apply({ kpi_id: 'biomasa_total', valor: '2.500 t' });
    expect(useKpis.getState().values['biomasa_total']?.valor).toBe('2.500 t');
  });

  it('flushAnnouncement throttlea a 1 cada 30s', () => {
    useKpis.getState().apply({ kpi_id: 'a', valor: '1' });
    const first = useKpis.getState().flushAnnouncement();
    expect(first).toContain('a');

    // Inmediatamente después: no debe anunciar.
    useKpis.getState().apply({ kpi_id: 'b', valor: '2' });
    expect(useKpis.getState().flushAnnouncement()).toBeNull();

    // A los 31s sí.
    vi.advanceTimersByTime(31_000);
    expect(useKpis.getState().flushAnnouncement()).toContain('b');
  });

  it('flushAnnouncement devuelve null si no hay buffer', () => {
    expect(useKpis.getState().flushAnnouncement()).toBeNull();
  });
});
