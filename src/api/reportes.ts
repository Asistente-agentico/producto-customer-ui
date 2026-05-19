import { z } from 'zod';
import { rawRequest } from './client';
import { useCapabilities } from '@/stores/capabilities';
import { ReportDefinitionSchema } from '@/features/reportes/reporte.types';

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
