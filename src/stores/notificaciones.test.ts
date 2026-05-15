import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificaciones } from './notificaciones';

beforeEach(() => {
  useNotificaciones.getState().clear();
});

describe('useNotificaciones', () => {
  it('push agrega al inicio (más reciente arriba)', () => {
    useNotificaciones.getState().push({ nivel: 'info', titulo: 'A' });
    useNotificaciones.getState().push({ nivel: 'info', titulo: 'B' });
    const items = useNotificaciones.getState().items;
    expect(items.length).toBe(2);
    expect(items[0]?.titulo).toBe('B');
    expect(items[1]?.titulo).toBe('A');
  });

  it('marcarLeida cambia leida=true solo para esa notificación', () => {
    useNotificaciones.getState().push({ nivel: 'info', titulo: 'X', id: 'n1' });
    useNotificaciones.getState().push({ nivel: 'warn', titulo: 'Y', id: 'n2' });
    useNotificaciones.getState().marcarLeida('n1');
    const items = useNotificaciones.getState().items;
    expect(items.find((i) => i.id === 'n1')?.leida).toBe(true);
    expect(items.find((i) => i.id === 'n2')?.leida).toBe(false);
  });

  it('marcarTodasLeidas marca todas', () => {
    useNotificaciones.getState().push({ nivel: 'info', titulo: 'X' });
    useNotificaciones.getState().push({ nivel: 'warn', titulo: 'Y' });
    useNotificaciones.getState().marcarTodasLeidas();
    const items = useNotificaciones.getState().items;
    expect(items.every((i) => i.leida)).toBe(true);
  });

  it('dismiss elimina por id', () => {
    useNotificaciones.getState().push({ nivel: 'info', titulo: 'X', id: 'n1' });
    useNotificaciones.getState().push({ nivel: 'warn', titulo: 'Y', id: 'n2' });
    useNotificaciones.getState().dismiss('n1');
    const items = useNotificaciones.getState().items;
    expect(items.find((i) => i.id === 'n1')).toBeUndefined();
    expect(items.find((i) => i.id === 'n2')).toBeDefined();
  });

  it('prune descarta notificaciones cuyo TTL ya expiró', () => {
    vi.useFakeTimers();
    const created = new Date('2026-05-15T10:00:00Z').toISOString();
    useNotificaciones.getState().push({
      nivel: 'info',
      titulo: 'Vieja',
      ttl_ms: 5_000,
      ts: created,
    });
    useNotificaciones.getState().push({
      nivel: 'warn',
      titulo: 'Sin TTL',
    });
    // Adelantamos el clock 30 segundos.
    vi.setSystemTime(new Date('2026-05-15T10:00:30Z'));
    useNotificaciones.getState().prune();
    const items = useNotificaciones.getState().items;
    expect(items.find((i) => i.titulo === 'Vieja')).toBeUndefined();
    expect(items.find((i) => i.titulo === 'Sin TTL')).toBeDefined();
    vi.useRealTimers();
  });

  it('cap a 50 items para no inflar memoria', () => {
    for (let i = 0; i < 60; i += 1) {
      useNotificaciones.getState().push({ nivel: 'info', titulo: `n${i}` });
    }
    expect(useNotificaciones.getState().items.length).toBe(50);
  });
});
