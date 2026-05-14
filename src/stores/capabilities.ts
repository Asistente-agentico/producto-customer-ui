// Store de capabilities (sección 4.2 y 9.1 del spec).
//
// - Carga vía fetchCapabilities + parsing Zod tolerante.
// - Caché en localStorage con TTL de 15 min (A6 del plan).
// - Refetch cuando el cliente HTTP emite capabilities_version_changed.
// - Aplica branding a CSS vars / title / favicon (sección 20.2).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchCapabilities } from '@/api/capabilities';
import { onApiEvent } from '@/api/client';
import type { Capabilities } from '@/api/types';
import { log } from '@/observability/logger';

const TTL_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'customer-ui:capabilities';

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'degraded';

type CapabilitiesState = {
  capabilities: Capabilities | null;
  fetchedAt: number | null;
  status: Status;
  errorMessage: string | null;
  load: (lang?: string) => Promise<void>;
  refresh: (lang?: string) => Promise<void>;
  clear: () => void;
};

export const useCapabilities = create<CapabilitiesState>()(
  persist(
    (set, get) => ({
      capabilities: null,
      fetchedAt: null,
      status: 'idle',
      errorMessage: null,

      async load(lang) {
        const state = get();
        const fresh =
          state.capabilities !== null &&
          state.fetchedAt !== null &&
          Date.now() - state.fetchedAt < TTL_MS;
        if (fresh) {
          set({ status: 'ready' });
          if (state.capabilities) applyCapabilities(state.capabilities);
          return;
        }
        await get().refresh(lang);
      },

      async refresh(lang) {
        set({ status: 'loading', errorMessage: null });
        try {
          const caps = await fetchCapabilities(lang);
          applyCapabilities(caps);
          set({ capabilities: caps, fetchedAt: Date.now(), status: 'ready' });
          log.info('lifecycle', 'capabilities_loaded', { version: caps.version });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Modo degradado: si ya tenemos caps en caché, lo dejamos para
          // que la UI siga funcionando; si no, marcamos degraded.
          const previous = get().capabilities;
          set({
            status: previous ? 'ready' : 'degraded',
            errorMessage: message,
          });
          log.warn('lifecycle', 'capabilities_load_failed', { message });
        }
      },

      clear() {
        set({
          capabilities: null,
          fetchedAt: null,
          status: 'idle',
          errorMessage: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        capabilities: state.capabilities,
        fetchedAt: state.fetchedAt,
      }),
      // Si el storage trae basura, lo descartamos.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.fetchedAt && Date.now() - state.fetchedAt > TTL_MS) {
          state.capabilities = null;
          state.fetchedAt = null;
        }
      },
    },
  ),
);

// Re-fetch automático cuando llega un header X-Capabilities-Version
// distinto al cacheado (lo emite el client HTTP).
if (typeof window !== 'undefined') {
  onApiEvent((ev) => {
    if (ev.kind === 'capabilities_version_changed') {
      log.info('lifecycle', 'capabilities_version_drift', {
        new_version: ev.new_version,
      });
      void useCapabilities.getState().refresh();
    }
  });
}

/**
 * Aplica el branding del tenant: CSS vars, document.title, favicon.
 * Se llama tras cada fetch exitoso de /capabilities.
 */
export function applyCapabilities(caps: Capabilities): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const colores = caps.ui.colores ?? {};
  if (colores.primario) root.style.setProperty('--color-primary', colores.primario);
  if (colores.sidebar) root.style.setProperty('--color-sidebar', colores.sidebar);
  if (colores.acento) root.style.setProperty('--color-accent', colores.acento);

  if (caps.ui.titulo) {
    document.title = caps.ui.titulo;
  }

  if (caps.ui.favicon_url) {
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (link) link.href = caps.ui.favicon_url;
  }
}
