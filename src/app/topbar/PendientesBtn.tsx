import { useEffect, useMemo, useRef } from 'react';
import { IconBell, IconChevronDown, IconAlertTriangle } from '@tabler/icons-react';
import { useUiToggles } from '@/stores/uiToggles';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';
import type { ModuloConfig } from '@/api/types';

/**
 * "Pendientes" — dropdown con items derivados cliente-side (Q7).
 *
 * Pendientes = acciones con estado `pendiente` + KPIs sobre umbral +
 * mensajes no leídos. Mientras los stores de acciones/mensajes-no-leídos
 * no existan (PR 8, futuro), usamos un mock filtrado por módulos
 * activos del usuario.
 *
 * Click-outside y Esc cierran. Click en el mismo botón también.
 */

type Pendiente = {
  id: string;
  tipo: 'borrador' | 'umbral' | 'defectos' | 'otro';
  sev: 'info' | 'warn' | 'error';
  titulo: string;
  sub?: string;
  ts: string;
  modulo: 'acciones' | 'kpis' | 'central' | 'reportes' | 'ml';
};

// Mock temporal — en producción se computa desde stores.
const MOCK_PENDIENTES: Pendiente[] = [
  {
    id: 'p1',
    tipo: 'borrador',
    sev: 'warn',
    titulo: 'Correo pendiente · Hugo Salinas',
    sub: 'Borrador listo · esperando confirmación tuya',
    ts: 'hace 2 min',
    modulo: 'acciones',
  },
  {
    id: 'p2',
    tipo: 'umbral',
    sev: 'warn',
    titulo: 'Parámetro crítico bajo umbral · LIN-003',
    sub: '6.0 mg/L · objetivo ≥ 6.5',
    ts: 'hace 14 min',
    modulo: 'kpis',
  },
  {
    id: 'p3',
    tipo: 'defectos',
    sev: 'warn',
    titulo: 'Defectos LIN-007 sobre umbral',
    sub: '27 u/d · zona objetivo 8–14',
    ts: 'hace 32 min',
    modulo: 'central',
  },
];

export default function PendientesBtn() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const open = useUiToggles((s) => s.pendientesOpen);
  const toggle = useUiToggles((s) => s.togglePendientes);
  const setOpen = useUiToggles((s) => s.setPendientes);
  const modulos = useCapabilities((s) => s.capabilities?.modulos);

  const visibles = useMemo(() => {
    if (!modulos) return MOCK_PENDIENTES;
    return MOCK_PENDIENTES.filter((p) => {
      const m = modulos[p.modulo as keyof typeof modulos] as ModuloConfig | undefined;
      return m?.enabled !== false;
    });
  }, [modulos]);

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
        className={[
          'h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md text-[12px] transition-colors',
          open
            ? 'bg-navy text-cream border border-navy'
            : 'bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
        ].join(' ')}
      >
        <IconAlertTriangle
          size={12}
          aria-hidden="true"
          className={open ? 'text-cream/85' : 'text-ink3'}
        />
        <span className="tracking-tight">
          {t('topbar.pendientes', { defaultValue: 'Pendientes' })}
        </span>
        {visibles.length > 0 ? (
          <span
            className={[
              'font-mono text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center',
              open ? 'bg-cream/20 text-cream' : 'bg-coral text-paper',
            ].join(' ')}
          >
            {visibles.length}
          </span>
        ) : null}
        <IconChevronDown
          size={10}
          aria-hidden="true"
          className={['transition-transform', open ? 'rotate-180' : ''].join(' ')}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+6px)] w-[380px] max-w-[calc(100vw-2rem)] z-30
                     rounded-lg bg-paper border border-rule shadow-lg"
        >
          <header className="px-4 py-3 border-b border-rule">
            <h3 className="font-display text-[14px] tracking-tight">
              {t('topbar.pendientes', { defaultValue: 'Pendientes' })}
            </h3>
            <p className="text-[11px] text-ink3 mt-0.5">
              {visibles.length} {visibles.length === 1 ? 'ítem' : 'ítems'} en módulos activos
            </p>
          </header>
          <ul className="max-h-[440px] overflow-y-auto divide-y divide-rule/60">
            {visibles.length === 0 ? (
              <li className="px-4 py-8 text-center text-[11px] text-ink3">No hay pendientes</li>
            ) : (
              visibles.map((p) => (
                <li key={p.id} className="px-4 py-2.5 hover:bg-cream/50">
                  <div className="flex items-start gap-2">
                    <IconBell
                      size={14}
                      className={p.sev === 'error' ? 'text-coral' : 'text-warn'}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-ink tracking-tight">{p.titulo}</p>
                      {p.sub ? <p className="text-[11px] text-ink2 mt-0.5">{p.sub}</p> : null}
                      <p className="text-[10px] text-ink3 mt-1">{p.ts}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
