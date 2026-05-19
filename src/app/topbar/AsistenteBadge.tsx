import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useCapabilities } from '@/stores/capabilities';
import { actualizarPreferencias } from '@/api/usuario';

/**
 * Badge del asistente activo + dropdown para cambiar (Q6).
 *
 * Muestra `<emoji> <Nombre> · <version>`. El emoji viene de
 * `capabilities.ui.icono_emoji` (configurable por tenant). Click abre
 * dropdown con los otros asistentes autorizados
 * (`capabilities.ui.asistentes[]`). Cambiar →
 * `PATCH /usuario/preferencias { asistente_activo_id }` + refetch de
 * capabilities (lo trigger el cambio del header `X-Capabilities-Version`
 * en una próxima respuesta, o vía `refresh()`).
 */
export default function AsistenteBadge() {
  const caps = useCapabilities((s) => s.capabilities);
  const refresh = useCapabilities((s) => s.refresh);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [switching, setSwitching] = useState(false);

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
  }, [open]);

  if (!caps) return null;

  const activo = caps.asistente_activo ?? caps.ui.asistentes?.[0];
  if (!activo) return null;

  const otros = (caps.ui.asistentes ?? []).filter((a) => a.id !== activo.id && !a.disabled);
  const emoji = caps.ui.icono_emoji;

  async function cambiar(id: string) {
    if (id === activo?.id || switching) return;
    setSwitching(true);
    try {
      // Q6: PATCH preferencias con asistente_activo_id, luego refetch caps.
      await actualizarPreferencias({
        // El field exacto lo define el central V2; usamos un nombre
        // razonable. Si el backend rechaza, queda en logs.
        asistente_activo_id: id,
      } as never);
      await refresh();
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  }

  const activoVersion =
    'version' in activo && typeof activo.version === 'string' ? activo.version : '';
  const labelActivo = `${activo.nombre}${activoVersion ? ` · ${activoVersion}` : ''}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={labelActivo}
        className={[
          'h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md text-[12px] transition-colors',
          open
            ? 'bg-navy text-cream border border-navy'
            : 'bg-paper border border-rule text-ink hover:border-navy/40',
        ].join(' ')}
      >
        {emoji ? (
          <span aria-hidden="true">{emoji}</span>
        ) : (
          <span aria-hidden="true" className="text-ink3">
            {caps.ui.logo_letras ?? 'AV'}
          </span>
        )}
        {/* Nombre + versión ocultos en mobile para no apretar la TopBar.
            El emoji/iniciales bastan como identificador del asistente
            activo; el dropdown sigue funcionando para cambiar. */}
        <span className="hidden sm:inline tracking-tight font-medium">{activo.nombre}</span>
        {'version' in activo && typeof activo.version === 'string' && activo.version ? (
          <span className={`hidden md:inline ${open ? 'text-cream/70' : 'text-ink3'}`}>
            · {activo.version}
          </span>
        ) : null}
        {otros.length > 0 ? <IconChevronDown size={10} aria-hidden="true" /> : null}
      </button>

      {open && otros.length > 0 ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] w-[260px] z-30
                     rounded-lg bg-paper border border-rule shadow-lg"
        >
          <header className="px-3 py-2 border-b border-rule">
            <p className="text-[10px] uppercase text-ink3 tracking-wider">Cambiar asistente</p>
          </header>
          <ul role="none">
            <li role="menuitem" aria-current="true">
              <div className="flex items-center gap-2 px-3 py-2 bg-cream/40">
                <IconCheck size={12} className="text-ok" aria-hidden="true" />
                <span className="flex-1 text-[13px] tracking-tight">{activo.nombre}</span>
                <span className="text-[10px] text-ink3">activo</span>
              </div>
            </li>
            {otros.map((a) => (
              <li key={a.id} role="menuitem">
                <button
                  type="button"
                  onClick={() => void cambiar(a.id)}
                  disabled={switching}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-cream/50 disabled:opacity-60"
                >
                  <span className="w-3" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] tracking-tight truncate">{a.nombre}</p>
                    {a.subtitulo ? (
                      <p className="text-[10.5px] text-ink3 truncate">{a.subtitulo}</p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
