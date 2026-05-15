import { type ReactNode, useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';

type Props = { children: ReactNode };

/**
 * Shell del producto post-login. Estructura (handoff v2.0 §1):
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │  TopBar (h-12 fija)                             │
 *   ├─────────────────────────────────────────────────┤
 *   │  KpiBand (PR 5 · condicional toggle)            │ ← slot
 *   ├──────────────┬──────────────────────────────────┤
 *   │  Sidebar     │  contenido (Outlet)              │
 *   │  (solo Chat) │                                  │
 *   ├──────────────┴──────────────────────────────────┤
 *   │  Footer (h-7 fijo · "Powered by OPCiber")       │
 *   └─────────────────────────────────────────────────┘
 *
 * Modo degradado: si `/capabilities` falla sin cache, sidebar oculto
 * y banner persistente arriba del body.
 */
export default function AppLayout({ children }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const status = useCapabilities((s) => s.status);
  const errorMessage = useCapabilities((s) => s.errorMessage);
  const refresh = useCapabilities((s) => s.refresh);

  const degraded = status === 'degraded';

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} hideMenuButton={degraded} />

      {/* TODO PR 5 · KpiBand slot debajo de la TopBar.
          Se renderiza solo cuando el toggle "KPI" del TopBar está ON
          (estado global `kpiBandOpen`). Inicia OFF (Q3 + handoff §3.1). */}

      {degraded ? (
        <div
          role="alert"
          className="bg-warn/10 border-y border-warn/30 px-4 py-2 text-sm flex items-center justify-between gap-4"
        >
          <span>
            {t('errores.capabilities_no_disponibles')}
            {errorMessage ? <em className="opacity-60 ml-2">({errorMessage})</em> : null}
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-sm underline hover:opacity-80"
          >
            {t('comun.reintentar')}
          </button>
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">
        {!degraded ? <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /> : null}
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
