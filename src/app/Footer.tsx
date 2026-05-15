/**
 * Footer global del producto. Aparece en TODAS las páginas (login,
 * bootstrap, chat, reportes, acciones, on-line, configuración).
 * Decisión firme del handoff v2.0 §3.9.
 */
export default function Footer() {
  return (
    <footer
      role="contentinfo"
      className="shrink-0 h-7 flex items-center justify-center px-4 border-t border-rule bg-paper text-[11px] text-ink3"
    >
      <span className="tracking-tight">
        Powered by OPCiber · © 2026 · Todos los derechos reservados
      </span>
    </footer>
  );
}
