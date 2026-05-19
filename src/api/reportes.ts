import { z } from 'zod';
import { rawRequest, requestJson } from './client';
import { useCapabilities } from '@/stores/capabilities';
import {
  DatamartSchema,
  ObservationSchema,
  PreflightResultSchema,
  PreviewPayloadSchema,
  ReportDefinitionSchema,
  RoleSchema,
  TimelineEventSchema,
  type Datamart,
  type Observation,
  type PreflightResult,
  type PreviewPayload,
  type ReportDefinition,
  type Role,
  type TimelineEvent,
} from '@/features/reportes/reporte.types';

/**
 * Schema Reporte v2 (Q10 · cada reporte declara sus formatos).
 *
 * `formato` legacy (enum fijo pdf/excel/csv) se mantiene opcional por
 * compat con responses del central V1; las consumidoras ahora usan
 * `formatos[]` (lista declarada por reporte).
 *
 * `habilitado_para_usuario` viene resuelto por el central según RBAC.
 * `razon_bloqueo` se muestra como tooltip/badge cuando no habilitado.
 *
 * PR 1 · campos del ciclo de vida (state, urgent, version, creator_id,
 * validator_id, approver_id, collaborators, frequency_code, coverage,
 * definition, iterations, next_action_for, next_action_label,
 * purge_in_days, stale, allowed_roles, approved_at, approved_by,
 * created_at, last_activity_at) agregados como opcionales para
 * compat hacia atrás con el central V1, que aún no los emite.
 */
export const ReporteSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    titulo: z.string().optional(),
    descripcion: z.string().optional(),
    gerencia: z.string().optional(),
    formatos: z.array(z.string()).default([]),
    formato: z.enum(['pdf', 'excel', 'csv']).optional(), // legacy V1
    habilitado_para_usuario: z.boolean().default(true),
    razon_bloqueo: z.string().optional(),
    duenio: z.string().optional(),
    version_actual: z.string().optional(),
    tipo: z.enum(['operativo', 'gerencial']).optional(),
    actualizado_en: z.string().optional(),
    tamano_bytes: z.number().optional(),
    // PR 1 · ciclo de vida del reporte (US-02 a US-06).
    state: z
      .enum([
        'borrador',
        'esperando_datos',
        'esperando_validacion',
        'iterando',
        'esperando_aprobacion',
        'aprobado',
        'publicado',
        'cerrado',
      ])
      .optional(),
    urgent: z.boolean().optional(),
    version: z.number().optional(), // bloqueo optimista vía If-Match
    creator_id: z.string().optional(),
    validator_id: z.string().optional(),
    approver_id: z.string().optional(),
    collaborators: z
      .array(
        z
          .object({
            user_id: z.string(),
            comment_count: z.number(),
          })
          .passthrough(),
      )
      .optional(),
    frequency_code: z
      .enum(['realtime', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'on_demand'])
      .optional(),
    coverage: z
      .object({
        from: z.string(),
        to: z.string(),
      })
      .passthrough()
      .optional(),
    definition: ReportDefinitionSchema.optional(),
    iterations: z.number().optional(),
    next_action_for: z.string().optional(),
    next_action_label: z.string().optional(),
    purge_in_days: z.number().nullable().optional(),
    stale: z.boolean().optional(),
    allowed_roles: z.array(z.string()).optional(),
    approved_at: z.string().optional(),
    approved_by: z.string().optional(),
    created_at: z.string().optional(),
    last_activity_at: z.string().optional(),
  })
  .passthrough();

export type Reporte = z.infer<typeof ReporteSchema>;

export const CatalogoSchema = z.object({
  items: z.array(ReporteSchema),
});

export type Catalogo = z.infer<typeof CatalogoSchema>;

function getReportesBaseUrl(): string {
  const caps = useCapabilities.getState().capabilities;
  const url = caps?.modulos.reportes?.base_url;
  if (!url) throw new Error('reportes_no_configurado');
  return url;
}

export async function fetchCatalogo(): Promise<Catalogo> {
  const baseUrl = getReportesBaseUrl();
  const res = await rawRequest('/catalogo', { baseUrl });
  const json = (await res.json()) as unknown;
  return CatalogoSchema.parse(json);
}

/**
 * Descarga un reporte en el formato pedido (Q11 · único canal de
 * salida de datos). El backend audita la descarga con HMAC chain.
 *
 * Endpoint v2: GET /reportes/{id}/download?formato=xlsx|pdf|pptx|pbi
 * Endpoint legacy V1: GET /reportes/{id}  (fallback si el catálogo no
 *   trae `formatos[]` poblado — solo durante la transición).
 */
export async function descargarReporte(
  id: string,
  formato?: string,
): Promise<{ blob: Blob; filename: string }> {
  const baseUrl = getReportesBaseUrl();
  const path = formato
    ? `/${encodeURIComponent(id)}/download?formato=${encodeURIComponent(formato)}`
    : `/${encodeURIComponent(id)}`;
  const res = await rawRequest(path, { baseUrl });
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?(?:"([^"]+)"|([^;]+))/i.exec(cd);
  const filename = match?.[1] ?? match?.[2] ?? `${id}.${formato ?? 'bin'}`;
  return { blob, filename };
}

// =========================================================================
// PR 2 · Cliente HTTP completo del módulo M3 (handoff §7).
//
// 19 endpoints que cubren US-02 a US-06, US-09 y US-10. US-07 (CI/CD)
// queda en stand-by: no se exponen endpoints `/cicd/*`.
//
// Convención de paths: relativos al baseUrl del módulo Reportes
// (`getReportesBaseUrl()`), sin prefijo `/reports/` (alineado con
// `fetchCatalogo` → `/catalogo`).
// =========================================================================

/**
 * Serializa un objeto de filtros a query string ignorando undefined/null.
 * Devuelve la cadena sin el `?` inicial; vacía si no hay claves útiles.
 */
function qs(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.set(key, String(value));
  }
  return usp.toString();
}

// -------------------------------------------------------------------------
// Inbox + listado (US-02)
// -------------------------------------------------------------------------

export type InboxFilters = {
  state?: string;
  q?: string;
  sort?: string;
  page?: number;
  page_size?: number;
};

/**
 * Bandeja contextual del usuario (US-02). El backend filtra por los
 * roles del usuario (creator/validator/approver) automáticamente.
 */
export async function fetchInbox(filters?: InboxFilters): Promise<Catalogo> {
  const baseUrl = getReportesBaseUrl();
  const query = qs({ as_user: 'me', ...(filters ?? {}) });
  const json = await requestJson<unknown>(`/?${query}`, { baseUrl, method: 'GET' });
  return CatalogoSchema.parse(json);
}

export const CountsSchema = z
  .object({
    total: z.number(),
    action_required: z.number(),
    by_state: z.record(z.string(), z.number()),
  })
  .passthrough();

export type Counts = z.infer<typeof CountsSchema>;

/** Contadores para los badges de la bandeja (US-02). */
export async function fetchCounts(): Promise<Counts> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>('/counts?as_user=me', {
    baseUrl,
    method: 'GET',
  });
  return CountsSchema.parse(json);
}

// -------------------------------------------------------------------------
// CRUD (US-03)
// -------------------------------------------------------------------------

/** Crea un borrador. Backend setea `state: 'borrador'` y `creator_id`. */
export async function createReport(payload: Partial<Reporte>): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>('/', { baseUrl, method: 'POST', json: payload });
  return ReporteSchema.parse(json);
}

/** Hidrata el designer / detail con el reporte y su definition. */
export async function getReport(id: string): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}`, {
    baseUrl,
    method: 'GET',
  });
  return ReporteSchema.parse(json);
}

/**
 * Update con bloqueo optimista vía `If-Match` (RFC 7232 quoted).
 * Si el backend devuelve 412 Precondition Failed, el caller debe
 * re-hidratar y reintentar.
 */
export async function updateReport(
  id: string,
  payload: Partial<Reporte>,
  version: number,
): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}`, {
    baseUrl,
    method: 'PUT',
    json: payload,
    headers: { 'If-Match': `"${version}"` },
  });
  return ReporteSchema.parse(json);
}

// -------------------------------------------------------------------------
// Designer (US-03)
// -------------------------------------------------------------------------

/** Catálogo de hechos/dimensiones permitidos para el creador. */
export async function fetchDatamart(): Promise<Datamart> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>('/datamart', { baseUrl, method: 'GET' });
  return DatamartSchema.parse(json);
}

/** Previsualización reactiva con la definición actual del designer. */
export async function previewReport(
  id: string,
  definition: ReportDefinition,
): Promise<PreviewPayload> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/preview`, {
    baseUrl,
    method: 'POST',
    json: { definition },
  });
  return PreviewPayloadSchema.parse(json);
}

/** Envía el borrador a validación; transiciona a `esperando_validacion`. */
export async function submitForValidation(id: string): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(
    `/${encodeURIComponent(id)}/submit-for-validation`,
    { baseUrl, method: 'POST' },
  );
  return ReporteSchema.parse(json);
}

// -------------------------------------------------------------------------
// Validación (US-05)
// -------------------------------------------------------------------------

export type ValidateDecision = 'approve_content' | 'request_iteration' | 'reject';

/** Decisión del validador. `approve_content` → `esperando_aprobacion`. */
export async function validateReport(
  id: string,
  decision: ValidateDecision,
  note?: string,
): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/validate`, {
    baseUrl,
    method: 'POST',
    json: { decision, note },
  });
  return ReporteSchema.parse(json);
}

// -------------------------------------------------------------------------
// Aprobación (US-06)
// -------------------------------------------------------------------------

/** Verificaciones previas a la aprobación (pivot, frecuencia, PII, etc). */
export async function preflightReport(id: string): Promise<PreflightResult> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/preflight`, {
    baseUrl,
    method: 'POST',
  });
  return PreflightResultSchema.parse(json);
}

/** Roles asignables filtrados por jerarquía respecto al aprobador. */
export async function fetchAssignableRoles(report_id: string): Promise<Role[]> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(
    `/roles/assignable?${qs({ report_id })}`,
    { baseUrl, method: 'GET' },
  );
  return z.array(RoleSchema).parse(json);
}

/** Aprobación final con asignación de visibilidad (allowed_roles). */
export async function approveReport(
  id: string,
  allowed_roles: string[],
  note?: string,
): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/approve`, {
    baseUrl,
    method: 'POST',
    json: { allowed_roles, note },
  });
  return ReporteSchema.parse(json);
}

/**
 * Marca el reporte como `publicado` (US-07 en stand-by → sin CI/CD).
 * Cuando se active US-07, el endpoint queda igual; cambia qué ocurre
 * detrás (pipeline visible vs publicación directa).
 */
export async function publishReport(id: string): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/publish`, {
    baseUrl,
    method: 'POST',
  });
  return ReporteSchema.parse(json);
}

/** Delega la aprobación a otro usuario (con permiso `aprobar_reporte`). */
export async function delegateApproval(
  id: string,
  new_approver_id: string,
): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/delegate-approval`, {
    baseUrl,
    method: 'POST',
    json: { new_approver_id },
  });
  return ReporteSchema.parse(json);
}

// -------------------------------------------------------------------------
// Detail / bitácora / timeline (US-04)
// -------------------------------------------------------------------------

/** Eventos del ciclo de vida (paginado para historiales largos). */
export async function fetchTimeline(id: string, page?: number): Promise<TimelineEvent[]> {
  const baseUrl = getReportesBaseUrl();
  const query = qs({ page });
  const path = query
    ? `/${encodeURIComponent(id)}/timeline?${query}`
    : `/${encodeURIComponent(id)}/timeline`;
  const json = await requestJson<unknown>(path, { baseUrl, method: 'GET' });
  return z.array(TimelineEventSchema).parse(json);
}

export type AddObservationPayload = {
  text: string;
  anchor?: string;
  mentions?: string[];
};

/** Agrega una observación a la bitácora del reporte (log inmutable). */
export async function addObservation(
  id: string,
  payload: AddObservationPayload,
): Promise<Observation> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/observations`, {
    baseUrl,
    method: 'POST',
    json: payload,
  });
  return ObservationSchema.parse(json);
}

/** Marca una observación como resuelta o la reabre. */
export async function resolveObservation(
  report_id: string,
  obs_id: string,
  resolved: boolean,
): Promise<Observation> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(
    `/${encodeURIComponent(report_id)}/observations/${encodeURIComponent(obs_id)}`,
    { baseUrl, method: 'PATCH', json: { resolved } },
  );
  return ObservationSchema.parse(json);
}

// -------------------------------------------------------------------------
// Retención + urgencia (US-09, US-10)
// -------------------------------------------------------------------------

/** Marca/desmarca el reporte como URGENTE (solo el creador, US-10). */
export async function markUrgent(
  id: string,
  urgent: boolean,
  reason?: string,
): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/urgent`, {
    baseUrl,
    method: 'POST',
    json: { urgent, reason },
  });
  return ReporteSchema.parse(json);
}

/** Solicita prórroga de la retención por inactividad (US-09). */
export async function extendRetention(id: string, days: number): Promise<Reporte> {
  const baseUrl = getReportesBaseUrl();
  const json = await requestJson<unknown>(`/${encodeURIComponent(id)}/extend-retention`, {
    baseUrl,
    method: 'POST',
    json: { days },
  });
  return ReporteSchema.parse(json);
}
