/**
 * Stub del detalle de un reporte (m3 pr-5 · bridge desde Inbox).
 *
 * Existe para que la navegación desde `ReporteInboxPage` (click en
 * cualquier card de la bandeja) tenga un destino válido. El cuerpo
 * real (timeline + bitácora + acciones por rol) llega en PR 7 según
 * el handoff M3.
 */
import { useParams } from 'react-router-dom';

export default function ReporteDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="p-6 max-w-5xl">
      <header className="mb-4">
        <h2 className="font-display text-xl font-semibold">Detalle del reporte</h2>
        <p className="text-sm text-ink2 mt-1">
          Detail en construcción · PR 7
          {id ? (
            <>
              {' · ID '}
              <span className="font-mono">{id}</span>
            </>
          ) : null}
        </p>
      </header>
      <div
        role="status"
        className="rounded-md border border-rule bg-paper p-6 text-sm text-ink2"
      >
        Esta pantalla materializa el bridge desde la bandeja. El detalle
        (timeline, bitácora compartida, acciones por rol) se incorpora en
        el PR 7 del handoff M3.
      </div>
    </section>
  );
}
