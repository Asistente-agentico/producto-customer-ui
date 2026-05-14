import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
  IconMessage,
  IconChartBar,
  IconFileDownload,
  IconSettings,
  IconX,
} from '@tabler/icons-react';
import { useCapabilities } from '@/stores/capabilities';
import ConversacionesList from '@/features/conversaciones/ConversacionesList';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);

  const modulosActivos = {
    chat: caps?.modulos.central.enabled ?? true,
    kpis: caps?.modulos.kpis?.enabled ?? false,
    reportes: caps?.modulos.reportes?.enabled ?? false,
  };

  const asistentes = (caps?.ui.asistentes ?? []).filter((a) => !a.disabled);

  return (
    <>
      {/* Overlay para mobile */}
      {open ? (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="md:hidden fixed inset-0 bg-black/50 z-20"
        />
      ) : null}

      <aside
        className={[
          'flex flex-col gap-4 border-r border-white/10 p-3 w-64 shrink-0',
          'fixed inset-y-0 left-0 z-30 transition-transform md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
        aria-label="Navegación principal"
      >
        <div className="md:hidden flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.cerrar')}
            className="min-w-[44px] min-h-[44px] grid place-items-center rounded hover:bg-white/10"
          >
            <IconX size={18} aria-hidden="true" />
          </button>
        </div>

        <nav>
          <ul className="flex flex-col gap-1">
            {modulosActivos.chat ? (
              <NavItem to="/chat" icon={<IconMessage size={18} />} label={t('nav.chat')} />
            ) : null}
            {modulosActivos.kpis ? (
              <NavItem
                to="/dashboard"
                icon={<IconChartBar size={18} />}
                label={t('nav.dashboard')}
              />
            ) : null}
            {modulosActivos.reportes ? (
              <NavItem
                to="/reportes"
                icon={<IconFileDownload size={18} />}
                label={t('nav.reportes')}
              />
            ) : null}
            <NavItem
              to="/configuracion"
              icon={<IconSettings size={18} />}
              label={t('nav.configuracion')}
            />
          </ul>
        </nav>

        {asistentes.length > 0 ? (
          <div className="mt-2">
            <h2 className="text-xs uppercase opacity-50 px-2 mb-2">Asistentes</h2>
            <ul className="flex flex-col gap-1">
              {asistentes.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 text-sm"
                    title={a.subtitulo}
                  >
                    {a.nombre}
                    {a.subtitulo ? (
                      <span className="block text-xs opacity-60">{a.subtitulo}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {modulosActivos.chat ? (
          <div className="mt-2 overflow-y-auto flex-1 min-h-0">
            <ConversacionesList />
          </div>
        ) : null}
      </aside>
    </>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          [
            'flex items-center gap-2 px-2 py-2 min-h-[44px] rounded text-sm hover:bg-white/10',
            isActive ? 'bg-white/10 font-medium' : '',
          ].join(' ')
        }
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </NavLink>
    </li>
  );
}
