import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ConversacionesState = {
  lastConversacionId: string | null;
  setLast: (id: string | null) => void;
};

/**
 * Solo persiste el ID de la última conversación activa, para retomar
 * sesión al recargar (sección 9.1 del spec — Tier 2 localStorage).
 * Las conversaciones canónicas viven en el server.
 */
export const useConversacionesStore = create<ConversacionesState>()(
  persist(
    (set) => ({
      lastConversacionId: null,
      setLast: (id) => set({ lastConversacionId: id }),
    }),
    {
      name: 'customer-ui:conversaciones',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
