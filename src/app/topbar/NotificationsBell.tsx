import { useEffect, useRef } from 'react';
import { IconBell, IconBellOff } from '@tabler/icons-react';
import { useUiToggles } from '@/stores/uiToggles';
import { useNotificaciones } from '@/stores/notificaciones';
import { useTranslation } from 'react-i18next';

/**
 * Campana de notificaciones (handoff §3.2 / Q7). Lista transiente
 * cliente-side. Badge con count de no-leídas.
 */
export default function NotificationsBell() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const open = useUiToggles((s) => s.notificacionesOpen);
  const toggle = useUiToggles((s) => s.toggleNotificaciones);
  const setOpen = useUiToggles((s) => s.setNotificaciones);

  const items = useNotificaciones((s) => s.items);
  const marcarTodasLeidas = useNotificaciones((s) => s.marcarTodasLeidas);
  const noLeidas = items.filter((i) => !i.leida).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('topbar.notificaciones', { defaultValue: 'Notificaciones' })}
        title={t('topbar.notificaciones', { defaultValue: 'Notificaciones' })}
        className={[
          'min-w-[36px] h-8 relative inline-flex items-center justify-center rounded-md transition-colors',
          open
            ? 'bg-navy text-cream'
            : 'bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
        ].join(' ')}
      >
        {items.length === 0 ? (
          <IconBellOff size={14} aria-hidden="true" />
        ) : (
          <IconBell size={14} aria-hidden="true" />
        )}
        {noLeidas > 0 ? (
          <span
            aria-label={`${noLeidas} no leídas`}
            className="absolute -top-1 -right-1 font-mono text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center bg-coral text-paper"
          >
            {noLeidas}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] w-[360px] max-w-[calc(100vw-2rem)] z-30
                     rounded-lg bg-paper border border-rule shadow-lg"
        >
          <header className="px-4 py-3 border-b border-rule flex items-center justify-between gap-2">
            <h3 className="font-display text-[14px] tracking-tight">
              {t('topbar.notificaciones', { defaultValue: 'Notificaciones' })}
            </h3>
            {noLeidas > 0 ? (
              <button
                type="button"
                onClick={() => marcarTodasLeidas()}
                className="text-[11px] text-coral underline hover:opacity-80"
              >
                Marcar todas como leídas
              </button>
            ) : null}
          </header>
          <ul className="max-h-[440px] overflow-y-auto divide-y divide-rule/60">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-[11px] text-ink3">Sin notificaciones</li>
            ) : (
              items.map((it) => (
                <li key={it.id} className={['px-4 py-2.5', it.leida ? 'opacity-60' : ''].join(' ')}>
                  <p className="text-[12.5px] text-ink tracking-tight">{it.titulo}</p>
                  {it.sub ? <p className="text-[11px] text-ink2 mt-0.5">{it.sub}</p> : null}
                  <p className="text-[10px] text-ink3 mt-1">{it.ts}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
