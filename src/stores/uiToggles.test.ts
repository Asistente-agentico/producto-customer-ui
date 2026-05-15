import { beforeEach, describe, expect, it } from 'vitest';
import { useUiToggles } from './uiToggles';

beforeEach(() => {
  useUiToggles.setState({
    ultimaOpen: false,
    pendientesOpen: false,
    kpiBandOpen: false,
    notificacionesOpen: false,
  });
});

describe('useUiToggles', () => {
  it('arranca con todos los toggles en OFF (handoff §3.1)', () => {
    const s = useUiToggles.getState();
    expect(s.ultimaOpen).toBe(false);
    expect(s.pendientesOpen).toBe(false);
    expect(s.kpiBandOpen).toBe(false);
    expect(s.notificacionesOpen).toBe(false);
  });

  it('toggleUltima flippea el estado', () => {
    useUiToggles.getState().toggleUltima();
    expect(useUiToggles.getState().ultimaOpen).toBe(true);
    useUiToggles.getState().toggleUltima();
    expect(useUiToggles.getState().ultimaOpen).toBe(false);
  });

  it('setPendientes(true) abre, setPendientes(false) cierra', () => {
    useUiToggles.getState().setPendientes(true);
    expect(useUiToggles.getState().pendientesOpen).toBe(true);
    useUiToggles.getState().setPendientes(false);
    expect(useUiToggles.getState().pendientesOpen).toBe(false);
  });

  it('toggleKpiBand flippea sin afectar otros toggles', () => {
    useUiToggles.getState().setUltima(true);
    useUiToggles.getState().toggleKpiBand();
    expect(useUiToggles.getState().kpiBandOpen).toBe(true);
    expect(useUiToggles.getState().ultimaOpen).toBe(true);
  });

  it('closeAll cierra todo de una vez', () => {
    useUiToggles.getState().setUltima(true);
    useUiToggles.getState().setPendientes(true);
    useUiToggles.getState().setKpiBand(true);
    useUiToggles.getState().setNotificaciones(true);
    useUiToggles.getState().closeAll();
    const s = useUiToggles.getState();
    expect(s.ultimaOpen).toBe(false);
    expect(s.pendientesOpen).toBe(false);
    expect(s.kpiBandOpen).toBe(false);
    expect(s.notificacionesOpen).toBe(false);
  });
});
