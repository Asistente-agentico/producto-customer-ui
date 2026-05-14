// Cliente HTTP del customer UI (spec sección 4 y 20.1).
//
// Responsabilidades:
// - Inyectar headers transversales (X-Client-Version, Accept-Language).
// - Mandar cookies con credentials: 'include' (JWT viaja en HttpOnly).
// - Interceptar 401 una sola vez → POST /auth/refresh → reintentar.
//   Si el refresh falla, redirige al login.
// - Detectar versión desactualizada (X-Latest-Client-Version) y emitir
//   evento global para que el banner de "nueva versión" se entere.
// - Refrescar capabilities cuando llega X-Capabilities-Version distinto
//   (también vía evento global).
// - Parsear errores 4xx/5xx al shape uniforme (sección 4.10) y lanzar
//   ApiError tipado.

import { appConfig, appVersion } from '@/lib/config';
import { ApiError, extractErrorPayload } from './errors';

// ---------------------------------------------------------------------------
// Eventos globales
// ---------------------------------------------------------------------------

export type ApiEvent =
  | { kind: 'new_version_available'; latest: string; current: string }
  | { kind: 'capabilities_version_changed'; new_version: string }
  | { kind: 'auth_lost' };

type Listener = (event: ApiEvent) => void;
const listeners = new Set<Listener>();

export function onApiEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: ApiEvent): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      // Listeners no deben tumbar el client.
    }
  }
}

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

let lastCapabilitiesVersion: string | null = null;
let lastNotifiedClientVersion: string | null = null;
let refreshInflight: Promise<boolean> | null = null;

// Permite testear / resetear en unit tests sin recargar el módulo.
export function _resetClientStateForTests(): void {
  lastCapabilitiesVersion = null;
  lastNotifiedClientVersion = null;
  refreshInflight = null;
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export type RequestOptions = RequestInit & {
  /** Base URL distinta a la del central (ej: módulo de reportes). */
  baseUrl?: string;
  /** Si true, no intenta refresh en 401 (usado por el propio /auth/refresh). */
  skipRefresh?: boolean;
  /** Idioma activo; cae a appConfig.IDIOMA_DEFAULT si se omite. */
  acceptLanguage?: string;
  /** Body JSON; se serializa y agrega Content-Type. */
  json?: unknown;
};

export type RedirectFn = (url: string) => void;

let redirectToLogin: RedirectFn = (url) => {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
};

export function _setRedirectForTests(fn: RedirectFn): void {
  redirectToLogin = fn;
}

function buildUrl(path: string, baseUrl: string | undefined): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = baseUrl ?? appConfig.BACKEND_URL_CENTRAL;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

function buildHeaders(opts: RequestOptions): Headers {
  const headers = new Headers(opts.headers ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (opts.json !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-Client-Version')) {
    headers.set('X-Client-Version', appVersion);
  }
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', opts.acceptLanguage ?? appConfig.IDIOMA_DEFAULT);
  }
  return headers;
}

function inspectResponseHeaders(res: Response): void {
  const latest = res.headers.get('X-Latest-Client-Version');
  if (latest && latest !== appVersion && latest !== lastNotifiedClientVersion) {
    lastNotifiedClientVersion = latest;
    emit({ kind: 'new_version_available', latest, current: appVersion });
  }

  const capsVersion = res.headers.get('X-Capabilities-Version');
  if (capsVersion && capsVersion !== lastCapabilitiesVersion) {
    const previous = lastCapabilitiesVersion;
    lastCapabilitiesVersion = capsVersion;
    if (previous !== null) {
      emit({ kind: 'capabilities_version_changed', new_version: capsVersion });
    }
  }
}

async function doRefresh(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh', undefined), {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Client-Version': appVersion },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Permitir nuevos refresh en el futuro.
      setTimeout(() => {
        refreshInflight = null;
      }, 0);
    }
  })();
  return refreshInflight;
}

/**
 * Llamada base. Lanza ApiError en respuestas no-2xx; devuelve la Response
 * cruda en 2xx para que la capa superior decida cómo parsear el body.
 */
export async function rawRequest(path: string, opts: RequestOptions = {}): Promise<Response> {
  const url = buildUrl(path, opts.baseUrl);
  const headers = buildHeaders(opts);
  const init: RequestInit = {
    ...opts,
    headers,
    credentials: opts.credentials ?? 'include',
  };
  if (opts.json !== undefined) {
    init.body = JSON.stringify(opts.json);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'network error',
      payload: {
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'network error',
        },
      },
      url,
      clientVersion: appVersion,
    });
  }

  inspectResponseHeaders(res);

  if (res.status === 401 && !opts.skipRefresh) {
    const refreshed = await doRefresh();
    if (refreshed) {
      // Reintentar exactamente una vez.
      const retry = await fetch(url, init);
      inspectResponseHeaders(retry);
      if (retry.ok) return retry;
      if (retry.status === 401) {
        emit({ kind: 'auth_lost' });
        redirectToLogin('/login');
      }
      await throwFromResponse(retry, url);
    }
    emit({ kind: 'auth_lost' });
    redirectToLogin('/login');
    await throwFromResponse(res, url);
  }

  if (!res.ok) {
    await throwFromResponse(res, url);
  }

  return res;
}

async function throwFromResponse(res: Response, url: string): Promise<never> {
  const payload = await extractErrorPayload(res, url);
  throw new ApiError({
    status: res.status,
    code: payload.code,
    message: payload.message,
    payload,
    url,
    clientVersion: appVersion,
  });
}

/**
 * Conveniencia: parsea el body como JSON. Lanza ApiError si el JSON
 * está roto pero el status fue 2xx (poco común; mejor reportarlo).
 */
export async function requestJson<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const res = await rawRequest(path, opts);
  // 204 No Content
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new ApiError({
      status: res.status,
      code: 'INVALID_JSON',
      message: err instanceof Error ? err.message : 'invalid json',
      payload: {
        error: { code: 'INVALID_JSON', message: 'response body was not valid JSON' },
      },
      url: res.url,
      clientVersion: appVersion,
    });
  }
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    requestJson<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    requestJson<T>(path, { ...opts, method: 'POST', json: body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    requestJson<T>(path, { ...opts, method: 'PUT', json: body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    requestJson<T>(path, { ...opts, method: 'DELETE' }),
};
