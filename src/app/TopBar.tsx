import { useTranslation } from 'react-i18next';
import { IconMenu2, IconLogout, IconLanguage } from '@tabler/icons-react';
import { useCapabilities } from '@/stores/capabilities';
import { useAuth } from '@/stores/auth';
import { changeLang, SUPPORTED_LANGS, type SupportedLang } from '@/i18n';
import { useState } from 'react';

type Props = {
  onToggleSidebar: () => void;
  hideMenuButton?: boolean;
};

export default function TopBar({ onToggleSidebar, hideMenuButton }: Props) {
  const { t, i18n } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const titulo = caps?.ui.titulo ?? t('app.titulo');
  const emoji = caps?.ui.icono_emoji;
  const iconoSistema = caps?.ui.icono_sistema ?? 'AV';

  return (
    <header
      className="flex items-center justify-between gap-4 px-4 h-14 border-b border-white/10"
      style={{ backgroundColor: 'var(--color-sidebar)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {!hideMenuButton ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden -ml-1 min-w-[44px] min-h-[44px] grid place-items-center rounded hover:bg-white/10"
            aria-label={t('nav.menu')}
          >
            <IconMenu2 size={20} aria-hidden="true" />
          </button>
        ) : null}
        <div
          aria-hidden="true"
          className="w-8 h-8 rounded grid place-items-center bg-white/10 text-sm font-bold"
        >
          {emoji ?? iconoSistema}
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate">{titulo}</h1>
          {caps?.tenant.nombre ? (
            <p className="text-xs opacity-60 truncate">{caps.tenant.nombre}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LangSwitcher current={i18n.language} />
        {user ? (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs opacity-80">{user.id_pseudo}</span>
            <span className="text-xs opacity-50">{user.rol}</span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          className="min-w-[44px] min-h-[44px] grid place-items-center rounded hover:bg-white/10"
          aria-label={t('nav.cerrar_sesion')}
          title={t('nav.cerrar_sesion')}
        >
          <IconLogout size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function LangSwitcher({ current }: { current: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const activeLang = (SUPPORTED_LANGS as readonly string[]).includes(current)
    ? (current as SupportedLang)
    : 'es';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-3 min-h-[44px] rounded hover:bg-white/10 text-xs uppercase"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.configuracion')}
      >
        <IconLanguage size={16} aria-hidden="true" />
        {activeLang}
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-32 rounded-md border border-white/10 bg-[var(--color-sidebar)] shadow-lg z-10"
        >
          {SUPPORTED_LANGS.map((lang) => (
            <li key={lang}>
              <button
                type="button"
                role="option"
                aria-selected={lang === activeLang}
                onClick={() => {
                  void changeLang(lang);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10"
              >
                {lang.toUpperCase()}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
