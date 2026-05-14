import { create } from 'zustand';
import { fetchMe, loginIamInterno, logout as apiLogout } from '@/api/auth';
import { onApiEvent } from '@/api/client';
import type { AuthMe } from '@/api/types';
import { useCapabilities } from './capabilities';

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous' | 'verifying';

type AuthState = {
  status: AuthStatus;
  user: AuthMe | null;
  errorMessage: string | null;

  bootstrap: () => Promise<void>;
  loginInterno: (usuario: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  errorMessage: null,

  async bootstrap() {
    set({ status: 'verifying', errorMessage: null });
    const me = await fetchMe();
    if (me) {
      set({ status: 'authenticated', user: me });
    } else {
      set({ status: 'anonymous', user: null });
    }
  },

  async loginInterno(usuario: string, password: string) {
    set({ status: 'verifying', errorMessage: null });
    try {
      const me = await loginIamInterno(usuario, password);
      set({ status: 'authenticated', user: me });
    } catch (err) {
      set({
        status: 'anonymous',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  async signOut() {
    await apiLogout();
    set({ status: 'anonymous', user: null, errorMessage: null });
    useCapabilities.getState().clear();
  },
}));

// El client HTTP emite auth_lost si /auth/refresh falla. Sincronizamos
// el store para que la UI reaccione (router redirige a /login).
if (typeof window !== 'undefined') {
  onApiEvent((ev) => {
    if (ev.kind === 'auth_lost') {
      useAuth.setState({ status: 'anonymous', user: null });
      useCapabilities.getState().clear();
    }
  });
}
