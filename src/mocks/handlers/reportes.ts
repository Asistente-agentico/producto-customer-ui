import { http, HttpResponse } from 'msw';

const REPORTES_BASE = 'http://localhost:8081';

/**
 * Mock catálogo de reportes (Q10 + Q11). Cada reporte declara sus
 * formatos disponibles, gerencia, tipo, dueño y versión. El campo
 * `habilitado_para_usuario` simula RBAC ya resuelto por el central.
 *
 * Cuando el central V2 esté listo, este mock se desactiva con
 * USE_MOCKS=false y la UI consume el catálogo real.
 */
const catalogo = [
  {
    id: 'defectos_mensual',
    nombre: 'Defectos mensuales por línea',
    descripcion: 'Resumen consolidado de defectos por línea de producción.',
    gerencia: 'Operaciones',
    formatos: ['xlsx', 'pdf'],
    habilitado_para_usuario: true,
    duenio: 'Pablo Cifuentes',
    version_actual: 'v3.2',
    tipo: 'operativo' as const,
    actualizado_en: '2026-05-13T03:00:00Z',
  },
  {
    id: 'volumen_diario',
    nombre: 'Volumen diario',
    descripcion: 'Datos crudos de volumen para análisis offline.',
    gerencia: 'Operaciones',
    formatos: ['xlsx', 'pdf', 'pbi'],
    habilitado_para_usuario: true,
    duenio: 'Pablo Cifuentes',
    version_actual: 'v2.0',
    tipo: 'operativo' as const,
    actualizado_en: '2026-05-13T03:05:00Z',
  },
  {
    id: 'ratio_semanal',
    nombre: 'Ratio insumo/salida consolidado semanal',
    descripcion: 'Eficiencia productiva por línea y semana, con tendencias.',
    gerencia: 'Operaciones',
    formatos: ['xlsx', 'pptx'],
    habilitado_para_usuario: true,
    duenio: 'María Soto',
    version_actual: 'v1.8',
    tipo: 'operativo' as const,
    actualizado_en: '2026-05-13T03:10:00Z',
  },
  {
    id: 'margen_sku',
    nombre: 'Margen por SKU',
    descripcion: 'Análisis de márgenes por producto y canal.',
    gerencia: 'Comercial',
    formatos: ['xlsx', 'pdf', 'pptx', 'pbi'],
    habilitado_para_usuario: false,
    razon_bloqueo: 'Requiere rol Comercial',
    duenio: 'Diego Salazar',
    version_actual: 'v4.1',
    tipo: 'gerencial' as const,
    actualizado_en: '2026-05-13T03:15:00Z',
  },
  {
    id: 'gastos_operacionales',
    nombre: 'Gastos operacionales consolidados',
    descripcion: 'Detalle de gastos por línea de costo.',
    gerencia: 'Finanzas',
    formatos: ['xlsx', 'pdf'],
    habilitado_para_usuario: false,
    razon_bloqueo: 'Requiere rol Gerencia',
    duenio: 'Andrea Hidalgo',
    version_actual: 'v2.5',
    tipo: 'gerencial' as const,
    actualizado_en: '2026-05-13T03:20:00Z',
  },
];

function mimeForFormato(formato: string): string {
  switch (formato) {
    case 'pdf':
      return 'application/pdf';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'pbi':
      return 'application/octet-stream';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

export const reportesHandlers = [
  http.get(`${REPORTES_BASE}/catalogo`, () => {
    return HttpResponse.json({ items: catalogo });
  }),

  // Endpoint v2 — descarga audita server-side (Q11).
  http.get(`${REPORTES_BASE}/:id/download`, ({ request, params }) => {
    const id = String(params.id);
    const url = new URL(request.url);
    const formato = url.searchParams.get('formato') ?? 'xlsx';
    const item = catalogo.find((r) => r.id === id);
    if (!item) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Reporte no encontrado.' } },
        { status: 404 },
      );
    }
    if (!item.habilitado_para_usuario) {
      return HttpResponse.json(
        {
          error: {
            code: 'RBAC_DENIED',
            message: item.razon_bloqueo ?? 'Sin permisos para descargar este reporte.',
          },
        },
        { status: 403 },
      );
    }
    if (!item.formatos.includes(formato)) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `El reporte no soporta el formato "${formato}".`,
          },
        },
        { status: 400 },
      );
    }
    const contenido = `Reporte mock: ${item.nombre}\nFormato: ${formato}\nGenerado: ${new Date().toISOString()}\n`;
    const blob = new Blob([contenido], { type: mimeForFormato(formato) });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': blob.type,
        'Content-Disposition': `attachment; filename="${item.id}.${formato}"`,
      },
    });
  }),

  // Endpoint legacy V1 (sin /download). Lo mantenemos para no romper
  // mocks externos que aún apunten ahí. Cuando el central V2 esté
  // listo, este handler se elimina.
  http.get(`${REPORTES_BASE}/:id`, ({ params }) => {
    const id = String(params.id);
    const item = catalogo.find((r) => r.id === id);
    if (!item) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Reporte no encontrado.' } },
        { status: 404 },
      );
    }
    const formato = item.formatos[0] ?? 'xlsx';
    const contenido = `Reporte mock legacy: ${item.nombre}\nFormato: ${formato}\nGenerado: ${new Date().toISOString()}\n`;
    const blob = new Blob([contenido], { type: mimeForFormato(formato) });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': blob.type,
        'Content-Disposition': `attachment; filename="${item.id}.${formato}"`,
      },
    });
  }),
];
