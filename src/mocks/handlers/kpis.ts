import { http, HttpResponse } from 'msw';

/**
 * Mock de SSE de KPIs. Devuelve un ReadableStream con eventos
 * kpi_update y heartbeat según el contrato del spec (sección 4.7).
 *
 * Como MSW corre dentro del service worker, podemos generar el stream
 * en TypeScript con un ReadableStream y `text/event-stream`.
 */
const KPI_BASE = 'http://localhost:8082';

const kpisIniciales: Array<{ kpi_id: string; rangoMin: number; rangoMax: number; unidad: string }> =
  [
    { kpi_id: 'volumen_total', rangoMin: 2400, rangoMax: 2500, unidad: 't' },
    { kpi_id: 'defectos', rangoMin: 0.7, rangoMax: 1.1, unidad: '%' },
    { kpi_id: 'ratio_insumo_salida_promedio', rangoMin: 1.35, rangoMax: 1.55, unidad: '' },
  ];

function randomInRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function formatValor(n: number, unidad: string): string {
  return unidad ? `${n.toLocaleString('es-CL')} ${unidad}` : String(n);
}

export const kpisHandlers = [
  http.get(`${KPI_BASE}/stream`, () => {
    const encoder = new TextEncoder();
    let stop = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        function emit(eventName: string, data: unknown) {
          if (stop) return;
          const chunk = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        }

        // Emisión inicial: un valor por KPI.
        for (const k of kpisIniciales) {
          const valor = randomInRange(k.rangoMin, k.rangoMax);
          emit('kpi_update', {
            kpi_id: k.kpi_id,
            valor: formatValor(valor, k.unidad),
            ts: new Date().toISOString(),
          });
        }

        interval = setInterval(() => {
          // Cada 4s actualizamos un KPI aleatorio.
          const target = kpisIniciales[Math.floor(Math.random() * kpisIniciales.length)]!;
          const valor = randomInRange(target.rangoMin, target.rangoMax);
          emit('kpi_update', {
            kpi_id: target.kpi_id,
            valor: formatValor(valor, target.unidad),
            ts: new Date().toISOString(),
          });
          // Heartbeat cada 4 emisiones aprox.
          if (Math.random() < 0.25) {
            emit('heartbeat', { ts: new Date().toISOString() });
          }
        }, 4000);
      },
      cancel() {
        stop = true;
        if (interval) clearInterval(interval);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),
];
