/**
 * Stub del Designer de reportes (m3 pr-4 · bridge desde /reportes).
 *
 * Esta pantalla existe solo para que el bridge "+ Crear reporte" del
 * catálogo tenga un destino válido y no caiga al catch-all. El cuerpo
 * real (DatamartTree + DropZones + PreviewPivot) llega en PR 6 según
 * el handoff M3.
 *
 * Layout: el TopBar viene del AppLayout del ProtectedShell, así que
 * acá solo se renderiza el contenido principal.
 */
export default function ReportesDesignerPage() {
  return (
    <section className="p-6 max-w-5xl">
      <header className="mb-4">
        <h2 className="font-display text-xl font-semibold">Designer de reportes</h2>
        <p className="text-sm text-ink2 mt-1">
          Designer en construcción · PR 6
        </p>
      </header>
      <div
        role="status"
        className="rounded-md border border-rule bg-paper p-6 text-sm text-ink2"
      >
        Esta pantalla materializa el bridge desde el catálogo. El editor de
        reportes (panel del datamart, dropzones, previsualización reactiva)
        se incorpora en el PR 6 del handoff M3.
      </div>
    </section>
  );
}
