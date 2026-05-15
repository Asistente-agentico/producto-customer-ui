// Composer — solo input + scope chips. KPIs y Pendientes ahora viven en TopBar/KpiBand.

const { useState: useStateCo, useRef: useRefCo } = React;

function Composer() {
  const [value, setValue] = useStateCo('');
  const ref = useRefCo(null);
  const conv = useConversation();

  const autosize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const send = () => {
    const text = value.trim();
    if (!text || !conv || conv.streaming) return;
    conv.sendMessage(text);
    setValue('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="border-t border-rule bg-paper">
      <div className="px-8 py-4">
        <div className="focus-ring rounded-xl border border-rule bg-white transition-shadow">
          <div className="flex items-center justify-end gap-2 px-3 pt-2.5">
            <div className="mono-label text-ink3 shrink-0">
              {conv?.streaming ? 'generando…' : 'modo · conversación'}
            </div>
          </div>

          <textarea
            ref={ref}
            value={value}
            onChange={(e) => { setValue(e.target.value); autosize(e.target); }}
            onKeyDown={onKey}
            placeholder="Pregunta algo del ámbito activo… (↵ enviar · ⇧↵ nueva línea)"
            rows={2}
            disabled={conv?.streaming}
            className="w-full bg-transparent px-4 py-3 text-[15px] leading-[1.55]
                       text-ink placeholder:text-ink3 resize-none outline-none
                       font-sans disabled:opacity-50"
          />

          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <ToolBtn label="Adjuntar"><I.Attach size={15} /></ToolBtn>
              <ToolBtn label="Voz"><I.Mic size={15} /></ToolBtn>
              <ToolBtn label="Plantillas"><I.Folder size={15} /></ToolBtn>
            </div>

            <button
              onClick={send}
              disabled={!value.trim() || conv?.streaming}
              className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-md
                         bg-coral text-cream text-[12.5px] tracking-tight
                         hover:bg-coral-2 transition-colors
                         disabled:bg-rule disabled:text-ink3 disabled:cursor-not-allowed
                         shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
              Enviar
              <span className="font-mono text-[10.5px] opacity-80">↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeChip({ children, muted }) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px]',
      muted ? 'text-ink2 bg-rule/50' : 'text-navy bg-navy/[.07]',
    ].join(' ')}>
      {children}
    </span>
  );
}

function ToolBtn({ children, label }) {
  return (
    <button
      title={label}
      className="flex items-center px-2 py-1.5 rounded-md text-ink3
                 hover:text-ink hover:bg-rule/60 transition-colors">
      {children}
    </button>
  );
}

window.Composer = Composer;
