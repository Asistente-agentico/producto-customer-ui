import { NavLink } from 'react-router-dom';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';
import type { ModuloConfig } from '@/api/types';

/**
 * Cluster de módulos en la TopBar (handoff §3.2):
 * Chat · ML · Reportes · Acciones · on-line
 *
 * - Verde si habilitado, gris con etiqueta `(No habilitado)` si no.
 * - KPIs no aparece como módulo separado en el cluster — su slot lo
 *   cubren el botón "KPI" (toggle de la banda) y la ruta "on-line".
 * - "Chat" siempre visible (módulo central).
 * - "on-line" navega a `/on-line` (vista del módulo KPIs streaming).
 */

type Slot = {
  id: 'central' | 'ml' | 'reportes' | 'acciones' | 'kpis';
  label: string;
  to: string;
};

const SLOTS: Slot[] = [
  { id: 'central', label: 'Chat', to: '/chat' },
  { id: 'ml', label: 'ML', to: '/ml' },
  { id: 'reportes', label: 'Reportes', to: '/reportes' },
  { id: 'acciones', label: 'Acciones', to: '/acciones' },
  { id: 'kpis', label: 'on-line', to: '/on-line' },
];

export default function ModulesNav() {
  const modulos = useCapabilities((s) => s.capabilities?.modulos);
  const { t: _t } = useTranslation();

  return (
    <nav aria-label="Módulos" className="hidden md:flex items-center gap-1">
      {SLOTS.map((slot) => {
        const m = modulos?.[slot.id as keyof typeof modulos] as ModuloConfig | undefined;
        const enabled = slot.id === 'central' ? true : m?.enabled === true;
        return <ModuleChip key={slot.id} slot={slot} enabled={enabled} />;
      })}
    </nav>
  );
}

function ModuleChip({ slot, enabled }: { slot: Slot; enabled: boolean }) {
  if (!enabled) {
    return (
      <span
        title="No habilitado en este deployment"
        className="h-8 inline-flex items-center px-2 rounded-md text-[11px] text-ink3 cursor-default"
      >
        <span className="tracking-tight">{slot.label}</span>
        <span className="ml-1 text-[10px] opacity-70">(no hab.)</span>
      </span>
    );
  }
  return (
    <NavLink
      to={slot.to}
      className={({ isActive }) =>
        [
          'h-8 inline-flex items-center px-2.5 rounded-md text-[12px] transition-colors',
          isActive ? 'text-navy bg-cream font-semibold' : 'text-ok hover:bg-cream/50',
        ].join(' ')
      }
      end
    >
      <span className="tracking-tight">{slot.label}</span>
    </NavLink>
  );
}
