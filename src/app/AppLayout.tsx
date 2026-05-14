import { type ReactNode, useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';

type Props = { children: ReactNode };

export default function AppLayout({ children }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const status = useCapabilities((s) => s.status);
  const errorMessage = useCapabilities((s) => s.errorMessage);
  const refresh = useCapabilities((s) => s.refresh);

  // Modo degradado: si /capabilities falla y no había cache, ocultamos
  // sidebar y mostramos banner persistente.
  const degraded = status === 'degraded';

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} hideMenuButton={degraded} />

      {degraded ? (
        <div
          role="alert"
          className="bg-amber-500/15 border-y border-amber-500/30 px-4 py-2 text-sm flex items-center justify-between gap-4"
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
    </div>
  );
}
