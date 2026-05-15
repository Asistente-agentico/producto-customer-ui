import { IconMenu2, IconLogout } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/auth';
import DateBlock from './topbar/DateBlock';
import UltimaConvBtn from './topbar/UltimaConvBtn';
import PendientesBtn from './topbar/PendientesBtn';
import KpisBtn from './topbar/KpisBtn';
import ModulesNav from './topbar/ModulesNav';
import NotificationsBell from './topbar/NotificationsBell';
import AsistenteBadge from './topbar/AsistenteBadge';
import LangSwitcher from './topbar/LangSwitcher';

type Props = {
  onToggleSidebar: () => void;
  hideMenuButton?: boolean;
};

/**
 * TopBar v2 (handoff §3.2). Layout horizontal h-12 sobre bg-paper:
 *
 *   [hamburger] [📅 fecha] [Última] [Pendientes ▾] [KPI]
 *      ╴╴╴╴ flex-1 ╴╴╴╴╴╴
 *      [Chat · ML · Reportes · Acciones · on-line]
 *      | [🌐 idioma] [🔔 N] [🐟 Asistente ▾] [⏏]
 *
 * Reglas (§3.1 + Q3):
 * - La pantalla arranca limpia. Todos los toggles en OFF al cargar.
 * - "Última", "Pendientes", "KPI" son toggles puros (click vuelve a
 *   cerrar). Dropdowns adicionalmente cierran con click-outside / Esc.
 * - "KPIs" NO aparece como módulo en el cluster — su slot es el botón
 *   KPI + la banda inline.
 * - Logout permanece en TopBar hasta PR 8 (luego pasa a menú perfil).
 */
export default function TopBar({ onToggleSidebar, hideMenuButton }: Props) {
  const { t } = useTranslation();
  const signOut = useAuth((s) => s.signOut);

  return (
    <header
      className="shrink-0 h-12 flex items-center gap-2 px-3 sm:px-5 bg-paper border-b border-rule"
      aria-label="Barra superior"
    >
      {!hideMenuButton ? (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden -ml-1 min-w-[44px] min-h-[44px] grid place-items-center rounded hover:bg-cream/50"
          aria-label={t('nav.menu')}
        >
          <IconMenu2 size={18} aria-hidden="true" className="text-ink" />
        </button>
      ) : null}

      <DateBlock />
      <UltimaConvBtn />
      <PendientesBtn />
      <KpisBtn />

      <div className="flex-1" />

      <ModulesNav />

      <span className="hidden md:block w-px h-5 bg-rule mx-1" aria-hidden="true" />

      <LangSwitcher />
      <NotificationsBell />
      <AsistenteBadge />

      <button
        type="button"
        onClick={() => void signOut()}
        className="min-w-[36px] h-8 grid place-items-center rounded-md bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink"
        aria-label={t('nav.cerrar_sesion')}
        title={t('nav.cerrar_sesion')}
      >
        <IconLogout size={14} aria-hidden="true" />
      </button>
    </header>
  );
}
