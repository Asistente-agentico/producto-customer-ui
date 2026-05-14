import { api, rawRequest } from './client';
import { AuthMeSchema, type AuthMe } from './types';
import { appConfig } from '@/lib/config';
import { log } from '@/observability/logger';

export type LoginRequest =
  | { mode: 'iam_interno'; usuario: string; password: string }
  | { mode: 'idp_externo'; returnTo?: string };

export async function fetchMe(): Promise<AuthMe | null> {
  try {
    const raw = await api.get<unknown>('/auth/me', { skipRefresh: false });
    const parsed = AuthMeSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    log.debug('auth', 'me_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function loginIamInterno(usuario: string, password: string): Promise<AuthMe> {
  const raw = await api.post<unknown>('/auth/login', { usuario, password }, { skipRefresh: true });
  const parsed = AuthMeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('login_response_invalid');
  }
  return parsed.data;
}

/**
 * Inicia el flujo OIDC redirigiendo al IdP externo.
 * El IdP devolverá al usuario al callback del backend, que setea el
 * cookie HttpOnly y redirige aquí. PKCE/state los maneja el backend.
 */
export function redirectToIdp(returnTo?: string): void {
  if (!appConfig.AUTH_IDP_URL) {
    throw new Error('AUTH_IDP_URL no está configurado');
  }
  const url = new URL(appConfig.AUTH_IDP_URL);
  if (returnTo) {
    url.searchParams.set('return_to', returnTo);
  }
  window.location.href = url.toString();
}

export async function logout(): Promise<void> {
  // Importante: no reintentar refresh aquí.
  try {
    await rawRequest('/auth/logout', { method: 'POST', skipRefresh: true });
  } catch (err) {
    // Aunque falle, limpiamos estado local. Las cookies HttpOnly las
    // borra el backend; si no las pudo borrar, el JWT seguirá expirando
    // por su cuenta.
    log.warn('auth', 'logout_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
