import { z } from 'zod';
import { rawRequest } from './client';
import { useCapabilities } from '@/stores/capabilities';

/**
 * Schema Reporte v2 (Q10 · cada reporte declara sus formatos).
 *
 * `formato` legacy (enum fijo pdf/excel/csv) se mantiene opcional por
 * compat con responses del central V1; las consumidoras ahora usan
 * `formatos[]` (lista declarada por reporte).
 *
 * `habilitado_para_usuario` viene resuelto por el central según RBAC.
 * `razon_bloqueo` se muestra como tooltip/badge cuando no habilitado.
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
