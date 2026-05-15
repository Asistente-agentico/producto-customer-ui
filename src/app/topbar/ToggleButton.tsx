import { type ReactNode } from 'react';

type Props = {
  on: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  badge?: ReactNode;
  ariaHaspopup?: 'true' | 'menu' | 'listbox' | 'dialog';
  ariaExpanded?: boolean;
};

/**
 * Botón toggle base de la TopBar (estilo del prototipo Omelette).
 * - Estado OFF: bg-paper + border rule + texto ink2.
 * - Estado ON: bg-navy + texto cream + border navy.
 * Touch target ≥44px (min-h-[44px] cuando aplica), pero la TopBar
 * usa h-8 explícito (32px) según diseño; aceptable porque los
 * targets están separados >8px y son visibles.
 */
export default function ToggleButton({
  on,
  onClick,
  icon,
  label,
  badge,
  ariaHaspopup,
  ariaExpanded,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-haspopup={ariaHaspopup}
      aria-expanded={ariaExpanded}
      className={[
        'h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md text-[12px] transition-colors',
        on
          ? 'bg-navy text-cream border border-navy'
          : 'bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
      ].join(' ')}
    >
      {icon ? (
        <span aria-hidden="true" className={on ? 'text-cream/85' : 'text-ink3'}>
          {icon}
        </span>
      ) : null}
      <span className="tracking-tight">{label}</span>
      {badge}
    </button>
  );
}
