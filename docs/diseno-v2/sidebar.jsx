// Sidebar — panels per ámbito autorizado, dropdowns por temática.
// Texto blanco · scroll visible · sin etiqueta JWT.

const { useState: useStateS } = React;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-cream/10">
      <div className="w-10 h-10 rounded-md bg-cream text-navy flex items-center justify-center
                      shadow-[inset_0_-2px_0_rgba(0,0,0,.08)]">
        <I.Logo size={22} stroke={1.8} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-[16px] leading-tight text-white tracking-tight">
          Tu Asistente Asistente Virtual
        </div>
        <div className="mt-1 text-[11.5px] text-cream/70 truncate">
          tu apoyo operativo
        </div>
      </div>
    </div>
  );
}

function AmbitoPanel({ ambito }) {
  const [open, setOpen] = useStateS(false);
  // Sólo últimas 4 semanas (agrupando temáticas por su semana)
  const buckets = groupByWeekLast4(ambito.tematicas);
  const total = buckets.reduce((a, b) => a + b.tematicas.reduce((aa, t) => aa + t.conversaciones, 0), 0);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left
                   hover:bg-navy-2 transition-colors border-b border-cream/5">
        <I.ChevronDown size={13}
          className={['text-cream/65 transition-transform shrink-0', open ? '' : '-rotate-90'].join(' ')} />
        <span className="flex-1 font-display text-[14px] tracking-tight text-white">
          {ambito.nombre}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-white/80 bg-cream/15 rounded px-1.5 py-0.5 min-w-[24px] text-center">
          {total}
        </span>
      </button>
      {open && (
        <div className="py-1 bg-black/10">
          {buckets.map((b) => (
            <div key={b.semana}>
              <div className="px-4 pt-3 pb-1 mono-label text-cream/55 normal-case tracking-wider text-[10px]">
                {b.semana}
              </div>
              {b.tematicas.map((t) => (
                <TematicaItem key={t.id} t={t} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Agrupa temáticas por su campo "semana" y devuelve los 4 buckets más recientes.
// El orden de los buckets se infiere del orden de aparición en el array original
// (las temáticas vienen ya ordenadas por fecha descendente en MOCK_AMBITOS).
function groupByWeekLast4(tematicas) {
  const seen = new Map();
  for (const t of tematicas) {
    if (!seen.has(t.semana)) seen.set(t.semana, []);
    seen.get(t.semana).push(t);
  }
  return Array.from(seen.entries()).slice(0, 4).map(([semana, tematicas]) => ({ semana, tematicas }));
}

function TematicaItem({ t }) {
  const [open, setOpen] = useStateS(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-2 px-4 py-2 text-left
                   text-white hover:bg-navy-2 transition-colors">
        <I.ChevronDown size={11}
          className={['text-cream/55 transition-transform shrink-0 mt-1', open ? '' : '-rotate-90'].join(' ')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-cream/70 shrink-0">{t.fecha}</span>
            {t.conversaciones > 1 && (
              <span className="font-mono text-[10px] tabular-nums text-cream/55">
                ×{t.conversaciones}
              </span>
            )}
          </div>
          <div className="text-[13px] tracking-tight text-white mt-0.5 leading-snug"
               style={{ textWrap: 'pretty' }}>
            {t.titulo}
          </div>
        </div>
      </button>
      {open && (
        <div className="ml-9 mb-1 space-y-0.5 pl-2 border-l border-cream/15">
          {Array.from({ length: t.conversaciones }).map((_, i) => (
            <button key={i}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
                         text-white/80 hover:bg-navy-2 hover:text-white transition-colors">
              <span className="w-1 h-1 rounded-full bg-cream/40 shrink-0" />
              <span className="text-[12.5px] truncate">
                {t.conversaciones === 1 ? 'Conversación principal'
                  : i === 0 ? 'Análisis inicial'
                  : i === 1 ? 'Seguimiento'
                  : 'Cierre'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const { mobile, ambitos, caps } = useApp();
  if (mobile) return null;
  const { usuario } = caps;
  return (
    <aside className="w-72 shrink-0 bg-navy text-white flex flex-col h-full
                      border-r border-black/30 overflow-y-auto scroll-navy"
           style={{ width: 288 }}>
      <Brand />
      <div className="flex-1">
        {ambitos.map((a) => <AmbitoPanel key={a.id} ambito={a} />)}
      </div>
      <div className="mt-auto border-t border-cream/10 px-4 py-3">
        <div className="text-[13px] text-white font-medium tracking-tight truncate">
          {usuario.nombre}
        </div>
        <div className="text-[11.5px] text-cream/70 mt-0.5 truncate">
          {usuario.rol} · {usuario.gerencia}
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
