import { http, HttpResponse } from 'msw';

const REPORTES_BASE = 'http://localhost:8081';

const catalogo = [
  {
    id: 'mortalidad_mensual',
    nombre: 'Mortalidad mensual por centro',
    descripcion: 'Resumen consolidado de mortalidad por centro de cultivo.',
    formato: 'pdf' as const,
    actualizado_en: '2026-05-13T03:00:00Z',
    tamano_bytes: 245_000,
  },
  {
    id: 'biomasa_diaria',
    nombre: 'Biomasa diaria (XLSX)',
    descripcion: 'Datos crudos de biomasa para análisis offline.',
    formato: 'excel' as const,
    actualizado_en: '2026-05-13T03:05:00Z',
    tamano_bytes: 1_240_000,
  },
];

export const reportesHandlers = [
  http.get(`${REPORTES_BASE}/catalogo`, () => {
    return HttpResponse.json({ items: catalogo });
  }),

  http.get(`${REPORTES_BASE}/:id`, ({ params }) => {
    const id = String(params.id);
    const item = catalogo.find((r) => r.id === id);
    if (!item) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Reporte no encontrado.' } },
        { status: 404 },
      );
    }
    const contenido = `Reporte mock: ${item.nombre}\nGenerado: ${new Date().toISOString()}\n`;
    const blob = new Blob([contenido], {
      type: item.formato === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': blob.type,
        'Content-Disposition': `attachment; filename="${item.id}.${item.formato === 'pdf' ? 'pdf' : 'xlsx'}"`,
      },
    });
  }),
];
