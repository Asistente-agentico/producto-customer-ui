import { create } from 'zustand';

/**
 * Notificaciones transientes (Q7 · computadas/emitidas cliente, sin
 * endpoint server-side). Tienen TTL: se autodescartan tras `ttl_ms`
 * cuando se llama a `prune()` (lo invoca el bell o un timer global).
 *
 * Tipos típicos:
 * - `accion_ejecutada`: módulo Acciones disparó la ejecución
 * - `kpi_umbral`: KPI cruzó umbral (del SSE)
 * - `reporte_listo`: reporte generado tras request
 * - `auth_drift`: refresh transparente OK
 *
 * Las notificaciones NO persisten al refresh (decisión del equipo).
 */

export type NivelNotificacion = 'info' | 'warn' | 'error' | 'success';

export type Notificacion = {
  id: string;
  nivel: NivelNotificacion;
  titulo: string;
  sub?: string;
  modulo?: string;
  ts: string; // ISO 8601
  ttl_ms?: number;
  leida?: boolean;
};

type NotificacionesState = {
  items: Notificacion[];
  push: (n: Omit<Notificacion, 'id' | 'ts'> & { id?: string; ts?: string }) => void;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  dismiss: (id: string) => void;
  prune: () => void;
  clear: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function genId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useNotificaciones = create<NotificacionesState>((set) => ({
  items: [],

  push(n) {
    const item: Notificacion = {
      id: n.id ?? genId(),
      nivel: n.nivel,
      titulo: n.titulo,
      sub: n.sub,
      modulo: n.modulo,
      ts: n.ts ?? nowIso(),
      ttl_ms: n.ttl_ms,
      leida: false,
    };
    set((s) => ({ items: [item, ...s.items].slice(0, 50) }));
  },

  marcarLeida(id) {
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, leida: true } : it)),
    }));
  },

  marcarTodasLeidas() {
    set((s) => ({ items: s.items.map((it) => ({ ...it, leida: true })) }));
  },

  dismiss(id) {
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
  },

  prune() {
    const now = Date.now();
    set((s) => ({
      items: s.items.filter((it) => {
        if (!it.ttl_ms) return true;
        const created = Date.parse(it.ts);
        return now - created < it.ttl_ms;
      }),
    }));
  },

  clear() {
    set({ items: [] });
  },
}));
