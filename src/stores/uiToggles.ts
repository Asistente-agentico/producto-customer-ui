import { create } from 'zustand';

/**
 * Estado global de los toggles de la TopBar (handoff v2.0 §3.1).
 * No persiste — la pantalla arranca limpia siempre (regla firme §3.1):
 * Última, Pendientes, KpiBand y Notificaciones inician en OFF.
 *
 * Los toggles `ultima`, `kpiBand` son toggles puros (click activa /
 * click cierra). `pendientes` y `notificaciones` son dropdowns
 * (también se cierran con click-outside o Esc, manejado en el
 * componente).
 */
type UiTogglesState = {
  ultimaOpen: boolean;
  pendientesOpen: boolean;
  kpiBandOpen: boolean;
  notificacionesOpen: boolean;
  setUltima: (v: boolean) => void;
  setPendientes: (v: boolean) => void;
  setKpiBand: (v: boolean) => void;
  setNotificaciones: (v: boolean) => void;
  toggleUltima: () => void;
  togglePendientes: () => void;
  toggleKpiBand: () => void;
  toggleNotificaciones: () => void;
  closeAll: () => void;
};

export const useUiToggles = create<UiTogglesState>((set) => ({
  ultimaOpen: false,
  pendientesOpen: false,
  kpiBandOpen: false,
  notificacionesOpen: false,
  setUltima: (v) => set({ ultimaOpen: v }),
  setPendientes: (v) => set({ pendientesOpen: v }),
  setKpiBand: (v) => set({ kpiBandOpen: v }),
  setNotificaciones: (v) => set({ notificacionesOpen: v }),
  toggleUltima: () => set((s) => ({ ultimaOpen: !s.ultimaOpen })),
  togglePendientes: () => set((s) => ({ pendientesOpen: !s.pendientesOpen })),
  toggleKpiBand: () => set((s) => ({ kpiBandOpen: !s.kpiBandOpen })),
  toggleNotificaciones: () => set((s) => ({ notificacionesOpen: !s.notificacionesOpen })),
  closeAll: () =>
    set({
      ultimaOpen: false,
      pendientesOpen: false,
      kpiBandOpen: false,
      notificacionesOpen: false,
    }),
}));
