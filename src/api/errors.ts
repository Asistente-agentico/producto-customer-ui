import { ErrorPayloadSchema, type ErrorPayload, type KnownErrorCode } from './types';

/**
 * Error que la UI propaga cuando el backend responde con status no-2xx.
 * Lleva el payload uniforme del spec (sección 4.10) si está disponible;
 * si el backend respondió algo distinto, sintetiza un payload mínimo.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly payload: ErrorPayload;
  readonly url: string;
  readonly clientVersion: string | undefined;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    payload: ErrorPayload;
    url: string;
    clientVersion?: string;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.payload = args.payload;
    this.url = args.url;
    this.clientVersion = args.clientVersion;
  }

  isCode(code: KnownErrorCode | string): boolean {
    return this.code === code;
  }
}

/**
 * Intenta extraer un ErrorPayload del body de una respuesta no-2xx.
 * Si el body no matchea el shape del spec, sintetiza uno.
 */
export async function extractErrorPayload(
  res: Response,
  url: string,
): Promise<ErrorPayload & { code: string; message: string }> {
  let body: unknown = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }

  const parsed = ErrorPayloadSchema.safeParse(body);
  if (parsed.success) {
    return {
      ...parsed.data,
      code: parsed.data.error.code,
      message: parsed.data.error.message,
    };
  }

  const fallbackCode = inferFallbackCode(res.status);
  const fallbackMessage =
    typeof body === 'object' && body !== null && 'detail' in body
      ? String((body as { detail: unknown }).detail)
      : res.statusText || `HTTP ${res.status}`;

  return {
    error: {
      code: fallbackCode,
      message: fallbackMessage,
    },
    code: fallbackCode,
    message: `${fallbackMessage} (${url})`,
  };
}

function inferFallbackCode(status: number): string {
  if (status === 401) return 'AUTH_FAILED';
  if (status === 403) return 'RBAC_DENIED';
  if (status === 426) return 'UPGRADE_REQUIRED';
  if (status === 502) return 'BACKEND_DOWN';
  if (status === 503) return 'MAINTENANCE';
  if (status >= 500) return 'BACKEND_ERROR';
  if (status >= 400) return 'VALIDATION_ERROR';
  return 'UNKNOWN';
}
