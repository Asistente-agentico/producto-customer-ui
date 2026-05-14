import { z } from 'zod';
import { rawRequest } from './client';
import { useCapabilities } from '@/stores/capabilities';

export const ReporteSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    descripcion: z.string().optional(),
    formato: z.enum(['pdf', 'excel', 'csv']),
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
 * Descarga un reporte. Devuelve un Blob para renderizar en el navegador
 * o dispararlo como descarga. JWT viaja en cookie HttpOnly.
 */
export async function descargarReporte(id: string): Promise<{ blob: Blob; filename: string }> {
  const baseUrl = getReportesBaseUrl();
  const res = await rawRequest(`/${encodeURIComponent(id)}`, { baseUrl });
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?(?:"([^"]+)"|([^;]+))/i.exec(cd);
  const filename = match?.[1] ?? match?.[2] ?? `${id}.bin`;
  return { blob, filename };
}
