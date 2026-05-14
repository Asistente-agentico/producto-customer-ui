import { create } from 'zustand';
import type { KpiUpdateEvent } from '@/api/types';

export type KpiSnapshot = {
  valor: string | number;
  ts?: string;
};

type KpisState = {
  values: Record<string, KpiSnapshot>;
  connected: boolean;
  lastAnnouncedAt: number;
  announceBuffer: string[];
  apply: (event: KpiUpdateEvent) => void;
  setConnected: (v: boolean) => void;
  clear: () => void;
  flushAnnouncement: () => string | null;
};

const ANNOUNCE_THROTTLE_MS = 30_000;

/**
 * Store de KPIs en vivo. Mantiene el último valor por id.
 * Para aria-live, throttlea anuncios a ≤1 cada 30s (sección 15.4).
 */
export const useKpis = create<KpisState>((set, get) => ({
  values: {},
  connected: false,
  lastAnnouncedAt: 0,
  announceBuffer: [],

  apply(event) {
    set((state) => {
      const values = {
        ...state.values,
        [event.kpi_id]: { valor: event.valor, ts: event.ts },
      };
      const buffer = state.announceBuffer.includes(event.kpi_id)
        ? state.announceBuffer
        : [...state.announceBuffer, event.kpi_id];
      return { values, announceBuffer: buffer };
    });
  },

  setConnected(v) {
    set({ connected: v });
  },

  clear() {
    set({ values: {}, announceBuffer: [], lastAnnouncedAt: 0 });
  },

  flushAnnouncement() {
    const state = get();
    if (state.announceBuffer.length === 0) return null;
    const now = Date.now();
    if (now - state.lastAnnouncedAt < ANNOUNCE_THROTTLE_MS) return null;
    const msg = `Actualizados: ${state.announceBuffer.join(', ')}`;
    set({ announceBuffer: [], lastAnnouncedAt: now });
    return msg;
  },
}));
