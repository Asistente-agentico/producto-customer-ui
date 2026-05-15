// View: Acciones — el módulo más delicado.
// Cola de acciones, detalle con flujo de aprobación, audit log.
// Las acciones son stateful: descartar / solicitar aprobación / aprobar / ejecutar
// mutan el estado y agregan eventos al audit log en tiempo real.

const { useState: useStateA } = React;

const INITIAL_ACTIONS = [
  {
    id: 'act-7c12',
    tipo: 'ENVIAR_CORREO',
    titulo: 'Notificar a Hugo Salinas',
    sub:    'Jefe Centro CTR-007 · alza mortalidad + caída O₂',
    estado: 'pendiente',
    origen: 'Conversación · 14:32',
    parametros: {
      destinatario: 'hugo.salinas@empresa.cl',
      asunto: 'CTR-007 jaula 4 · alza de mortalidad y caída O₂',
      cuerpo: 'Hugo,\n\nHemos detectado un alza sostenida de mortalidad en CTR-007 jaula 4 (27 unidades hoy, +38% vs semana anterior) que correlaciona con caída de O₂ disuelto bajo 6.5 mg/L durante 72h. Adjunto serie de evidencia.\n\n¿Podemos coordinar revisión de aireadores y muestreo branquial mañana AM?',
    },
    adjuntos: [
      { name: 'mortalidad_CTR-007_14d.xlsx', size: '42 KB' },
      { name: 'O2_temp_72h.png',              size: '156 KB' },
    ],
    audit: [
      { ts: '14:32:11', actor: 'asistente.engorda', accion: 'Acción propuesta', detalle: 'Generada por LLM tras consulta sobre mortalidad' },
      { ts: '14:32:54', actor: 'Matías Vergara',    accion: 'Revisión iniciada', detalle: 'Validación de destinatario y asunto' },
    ],
  },
  {
    id: 'act-6a01',
    tipo: 'AGENTE_IA',
    titulo: 'Disparar agente · calibración aireadores',
    sub:    'Revisión remota CTR-007 · estimado 12 min',
    estado: 'pendiente',
    origen: 'Manual',
    permiso_requerido: 'disparar_agente_aireadores',
  },
  {
    id: 'act-5e88',
    tipo: 'ENVIAR_CORREO',
    titulo: 'Resumen semanal a Gerencia',
    sub:    'Mortalidad + FCR + biomasa · 4 centros',
    estado: 'ejecutada',
    origen: 'Conversación · 11:08',
    ejecutada_at: 'hoy 11:09:33',
  },
  {
    id: 'act-3d12',
    tipo: 'ENVIAR_CORREO',
    titulo: 'Alerta inicial Hugo Salinas',
    sub:    'Borrador previo · descartado',
    estado: 'rechazada',
    origen: 'Conversación · 14:18',
  },
];

const ESTADOS = {
  pendiente:             { label: 'pendiente',              color: 'text-ink2',  bg: 'bg-rule/60',  dot: 'bg-ink3' },
  esperando_aprobacion:  { label: 'esperando aprobación',   color: 'text-warn',  bg: 'bg-warn/10',  dot: 'bg-warn pulse-dot' },
  aprobada:              { label: 'aprobada',               color: 'text-ok',    bg: 'bg-ok/10',    dot: 'bg-ok' },
  ejecutada:             { label: 'ejecutada',              color: 'text-ok',    bg: 'bg-ok/10',    dot: 'bg-ok' },
  rechazada:             { label: 'rechazada',              color: 'text-ink3',  bg: 'bg-rule/60',  dot: 'bg-ink3' },
  fallida:               { label: 'fallida',                color: 'text-coral', bg: 'bg-coral/10', dot: 'bg-coral' },
};

function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${e.color} ${e.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
      {e.label}
    </span>
  );
}

function RiesgoBadge({ level }) {
  const map = {
    bajo:  ['bajo',  'text-ok bg-ok/10'],
    medio: ['medio', 'text-warn bg-warn/10'],
    alto:  ['alto',  'text-coral bg-coral/10'],
  };
  const [t, c] = map[level] || map.medio;
  return <span className={`mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${c}`}>riesgo {t}</span>;
}

function TipoIcon({ tipo, size = 14 }) {
  if (tipo === 'ENVIAR_CORREO') return <I.Mail size={size} />;
  if (tipo === 'AGENTE_IA')     return <I.Robot size={size} />;
  return <I.Bolt size={size} />;
}

// Catálogo de agentes disponibles. Filtrable por permisos del usuario.
// En producción viene del módulo Acciones del backend (configurable por tenant).
const MOCK_AGENTES = [
  {
    id: 'aireadores',
    nombre: 'Calibración de aireadores',
    descripcion: 'Ajusta automáticamente los parámetros de aireadores en centros con O₂ bajo umbral.',
    permiso_requerido: 'disparar_agente_aireadores',
    duracion: '~12 min',
    impacto: 'alto',
  },
  {
    id: 'muestreo',
    nombre: 'Coordinar muestreo branquial',
    descripcion: 'Programa muestreo branquial con el equipo veterinario, agendado al día siguiente.',
    permiso_requerido: 'disparar_agente_muestreo',
    duracion: '~3 min',
    impacto: 'medio',
  },
  {
    id: 'notif_masiva',
    nombre: 'Notificación masiva a clientes',
    descripcion: 'Envía actualización de estado a todos los clientes con pedidos activos.',
    permiso_requerido: 'disparar_agente_notif_clientes',
    duracion: '~8 min',
    impacto: 'alto',
  },
  {
    id: 'reporte_emergencia',
    nombre: 'Generar reporte de emergencia',
    descripcion: 'Compila un informe técnico de incidente para envío a autoridades regulatorias.',
    permiso_requerido: 'disparar_agente_reporte_emergencia',
    duracion: '~25 min',
    impacto: 'alto',
  },
];

function ActionsView() {
  const [actions, setActions] = useStateA(INITIAL_ACTIONS);
  const [selectedId, setSelectedId] = useStateA(null);
  const [creating, setCreating] = useStateA(false);
  const selected = actions.find((a) => a.id === selectedId);

  const nowTs = () => {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  };

  const appendAudit = (action, entry) => {
    const baseAudit = action.audit || [];
    return { ...action, audit: [...baseAudit, { ts: nowTs(), ...entry }] };
  };

  const updateAction = (id, mutator) => {
    setActions((prev) => prev.map((a) => (a.id === id ? mutator(a) : a)));
  };

  // Transitions
  const descartar = (id) => updateAction(id, (a) =>
    appendAudit({ ...a, estado: 'rechazada' }, {
      actor: 'Matías Vergara',
      accion: 'Acción descartada',
      detalle: 'El usuario descartó el borrador antes de solicitar aprobación.',
    })
  );

  const solicitarAprobacion = (id) => updateAction(id, (a) =>
    appendAudit({
      ...a,
      estado: 'esperando_aprobacion',
      aprobador: a.aprobador || { nombre: 'Carolina Pérez', rol: 'Subgerente Operaciones' },
    }, {
      actor: 'Matías Vergara',
      accion: 'Solicitud de aprobación',
      detalle: `Enviada a ${(a.aprobador?.nombre) || 'Carolina Pérez'} (${(a.aprobador?.rol) || 'Subgerente Operaciones'}).`,
    })
  );

  const cancelarSolicitud = (id) => updateAction(id, (a) =>
    appendAudit({ ...a, estado: 'pendiente' }, {
      actor: 'Matías Vergara',
      accion: 'Solicitud cancelada',
      detalle: 'Revertida a borrador editable.',
    })
  );

  // Simulación: tercero aprueba
  const aprobar = (id) => updateAction(id, (a) =>
    appendAudit({ ...a, estado: 'aprobada' }, {
      actor: a.aprobador?.nombre || 'Carolina Pérez',
      accion: 'Aprobación recibida',
      detalle: `${a.aprobador?.rol || 'Subgerente Operaciones'} aprobó la acción. Lista para ejecutar.`,
    })
  );

  const ejecutar = (id) => updateAction(id, (a) =>
    appendAudit({
      ...a,
      estado: 'ejecutada',
      ejecutada_at: `hoy ${nowTs()}`,
    }, {
      actor: 'sistema.acciones',
      accion: 'Acción ejecutada',
      detalle: `Resultado: enviado al destinatario. Identificador interno reg-${Math.floor(Math.random() * 9000) + 1000}.`,
    })
  );

  const reabrir = (id) => updateAction(id, (a) =>
    appendAudit({ ...a, estado: 'pendiente' }, {
      actor: 'Matías Vergara',
      accion: 'Acción reabierta',
      detalle: 'Vuelta a borrador para edición.',
    })
  );

  // Actualizar parámetros de una acción (cuerpo, asunto, destinatario, etc.)
  const updateParams = (id, patch) => updateAction(id, (a) => ({
    ...a,
    parametros: { ...(a.parametros || {}), ...patch },
  }));

  // Crear nueva acción (correo o agente)
  const createAction = (newAction) => {
    const id = 'act-' + Math.random().toString(36).slice(2, 6);
    const ts = nowTs();
    const action = {
      id,
      estado: 'pendiente',
      origen: 'Manual',
      audit: [{
        ts,
        actor: 'Matías Vergara',
        accion: 'Acción creada',
        detalle: newAction.tipo === 'AGENTE_IA'
          ? `Borrador del agente "${newAction.titulo}" creado manualmente.`
          : 'Borrador de correo creado manualmente.',
      }],
      ...newAction,
    };
    setActions((prev) => [action, ...prev]);
    setSelectedId(id);
    setCreating(false);
  };

  const counts = {
    pendiente:            actions.filter((a) => a.estado === 'pendiente').length,
    esperando_aprobacion: actions.filter((a) => a.estado === 'esperando_aprobacion').length,
    aprobada:             actions.filter((a) => a.estado === 'aprobada').length,
    ejecutada:            actions.filter((a) => a.estado === 'ejecutada').length,
    rechazada:            actions.filter((a) => a.estado === 'rechazada').length,
  };

  return (
    <div className="h-full flex">
      {/* Queue */}
      <div className="w-[320px] shrink-0 border-r border-rule bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-rule">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-display text-[22px] tracking-tight">Acciones</h1>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md
                         bg-coral text-cream text-[11.5px] tracking-tight
                         hover:bg-coral-2 transition-colors
                         shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
              <I.Plus size={11} stroke={2} /> Nueva
            </button>
          </div>
          <p className="text-[12.5px] text-ink2 mt-0.5">Seguimiento de acciones</p>
          <div className="mt-3 flex items-center gap-3 text-[11.5px] flex-wrap">
            <Counter label="pendientes" value={counts.pendiente} />
            <Counter label="ejecutadas" value={counts.ejecutada} ok />
            <Counter label="descartadas" value={counts.rechazada} />
          </div>
        </div>
        <div className="overflow-y-auto scroll-paper flex-1">
          {actions.map((a) => (
            <button key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={[
                'w-full text-left px-4 py-3 border-b border-rule/60 transition-colors',
                selectedId === a.id ? 'bg-paper' : 'hover:bg-paper/60',
              ].join(' ')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-ink3"><TipoIcon tipo={a.tipo} /></span>
                <span className="mono-label text-ink3">{a.tipo.toLowerCase()}</span>
                <span className="font-mono text-[10.5px] text-ink3 ml-auto">{a.id}</span>
              </div>
              <div className="text-[13.5px] tracking-tight text-ink truncate">{a.titulo}</div>
              <div className="text-[12px] text-ink2 truncate mt-0.5">{a.sub}</div>
              <div className="mt-2 flex items-center justify-between">
                <EstadoBadge estado={a.estado} />
                <span className="mono-label text-ink3">{a.origen}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto scroll-paper">
        {selected ? (
          <ActionDetail
            action={selected}
            onDescartar={() => descartar(selected.id)}
            onEjecutar={() => ejecutar(selected.id)}
            onReabrir={() => reabrir(selected.id)}
            onUpdateParams={(patch) => updateParams(selected.id, patch)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
            <div className="w-12 h-12 rounded-lg bg-rule/50 text-ink3 flex items-center justify-center mb-4">
              <I.Bolt size={22} />
            </div>
            <h2 className="font-display text-[22px] tracking-tight text-ink">
              Selecciona una acción
            </h2>
            <p className="text-[13.5px] text-ink2 mt-2 max-w-[420px]" style={{ textWrap: 'pretty' }}>
              Elige una acción de la cola para ver su detalle, o crea una nueva con{' '}
              <strong className="text-ink">+ Nueva</strong>.
            </p>
          </div>
        )}
      </div>

      {creating && (
        <NewActionPanel
          onClose={() => setCreating(false)}
          onCreate={createAction}
        />
      )}
    </div>
  );
}

function Counter({ label, value, warn, ok }) {
  const c = warn ? 'text-warn' : ok ? 'text-ok' : 'text-ink2';
  return (
    <span className="flex items-center gap-1">
      <span className={`font-mono tabular-nums font-medium ${c}`}>{value}</span>
      <span className="mono-label text-ink3">{label}</span>
    </span>
  );
}

function ActionDetail({ action, onDescartar, onEjecutar, onReabrir, onUpdateParams }) {
  const a = action;
  const { caps } = useApp();
  const editable = a.estado === 'pendiente';
  return (
    <div className="max-w-[860px] mx-auto px-8 py-8">
      {/* header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono-label text-ink3">{a.id}</span>
            <span className="mono-label text-ink3">·</span>
            <span className="mono-label text-navy bg-navy/[.07] rounded px-1.5 py-0.5">{a.tipo}</span>
            <EstadoBadge estado={a.estado} />
          </div>
          <h2 className="font-display text-[26px] tracking-tight mt-2">{a.titulo}</h2>
          <p className="text-[13.5px] text-ink2 mt-1">{a.sub} · origen: {a.origen}</p>
        </div>
      </div>

      {/* Approval status banner */}
      {/* Aprobada banner */}
      {a.estado === 'ejecutada' && (
        <div className="rounded-lg border border-ok/30 bg-[#F0F7F5] p-4 mb-6 flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-md bg-ok/15 text-ok flex items-center justify-center">
            <I.Check size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mono-label text-ok">ejecutada</div>
            <p className="font-display text-[16px] tracking-tight mt-1">
              Acción completada · {a.ejecutada_at}
            </p>
            <div className="text-[12.5px] text-ink2 mt-1">
              Resultado: enviado. Conservada en audit log por 5 años.
            </div>
          </div>
        </div>
      )}

      {/* Rechazada banner */}
      {a.estado === 'rechazada' && (
        <div className="rounded-lg border border-ink3/30 bg-rule/30 p-4 mb-6 flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-md bg-ink3/15 text-ink3 flex items-center justify-center">
            <I.X size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mono-label text-ink3">descartada</div>
            <p className="font-display text-[16px] tracking-tight mt-1">
              Acción cerrada sin ejecutar.
            </p>
            <div className="text-[12.5px] text-ink2 mt-1">
              Permanece en el audit log como evidencia.
            </div>
          </div>
        </div>
      )}

      {/* Parameters */}
      {a.parametros && (
        <Card title="Parámetros" subtitle={editable ? 'editables · puedes modificar destinatario, asunto y cuerpo' : 'bloqueados · acción no editable en este estado'} mono={editable ? 'editable' : 'solo lectura'}>
          <div className="divide-y divide-rule">
            <KvRow k="De" v={
              <div className="flex items-center gap-2 flex-wrap">
                <I.Shield size={12} className="text-ok" />
                <span className="font-mono text-[13px]">{caps.usuario.email_institucional}</span>
                <span className="mono-label text-ok bg-ok/10 rounded-sm px-1.5 py-0.5 normal-case tracking-wide">
                  correo institucional · verificado
                </span>
              </div>
            } />
            <KvRow k="Para" v={
              editable ? (
                <input
                  type="email"
                  value={a.parametros.destinatario}
                  onChange={(e) => onUpdateParams({ destinatario: e.target.value })}
                  className="w-full bg-paper border border-rule rounded-md px-2 py-1 font-mono text-[13px] outline-none focus:border-navy"
                />
              ) : <span className="font-mono text-[13px]">{a.parametros.destinatario}</span>
            } />
            <KvRow k="Asunto" v={
              editable ? (
                <input
                  type="text"
                  value={a.parametros.asunto}
                  onChange={(e) => onUpdateParams({ asunto: e.target.value })}
                  className="w-full bg-paper border border-rule rounded-md px-2 py-1 text-[13.5px] outline-none focus:border-navy"
                />
              ) : a.parametros.asunto
            } />
            <KvRow k="Cuerpo" v={
              editable ? <CuerpoComposer value={a.parametros.cuerpo} onChange={(v) => onUpdateParams({ cuerpo: v })} />
                       : <pre className="font-sans text-[13px] whitespace-pre-wrap text-ink/95 leading-relaxed">{a.parametros.cuerpo}</pre>
            } top />
            <KvRow k="Adjuntos" v={
              <div className="flex flex-wrap gap-2 items-center">
                {(a.adjuntos || []).map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md
                                            bg-paper border border-rule font-mono text-[11.5px]">
                    <I.Paper size={11} className="text-ink3" />
                    {f.name}
                    <span className="text-ink3">{f.size}</span>
                    {editable && (
                      <button className="text-ink3 hover:text-coral ml-1">
                        <I.X size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {editable && (
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded-md
                                     border border-dashed border-rule text-ink3
                                     hover:border-navy/40 hover:text-ink2 text-[11.5px]">
                    <I.Attach size={11} /> Adjuntar
                  </button>
                )}
              </div>
            } />
          </div>
        </Card>
      )}

      {/* Permission check for agent actions */}
      {a.tipo === 'AGENTE_IA' && (() => {
        const requiredPerm = a.permiso_requerido || 'disparar_agente_aireadores';
        const autorizado = caps.usuario.permisos.includes(requiredPerm);
        return (
          <div className={[
            'mt-4 rounded-lg border p-3 flex items-start gap-3',
            autorizado ? 'border-ok/30 bg-ok/5' : 'border-coral/30 bg-coral/5',
          ].join(' ')}>
            <div className={[
              'shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
              autorizado ? 'bg-ok/15 text-ok' : 'bg-coral/15 text-coral',
            ].join(' ')}>
              {autorizado ? <I.Check size={15} /> : <I.Lock size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mono-label" style={{ color: autorizado ? '#2D7D6F' : '#E85C3C' }}>
                {autorizado ? 'permiso verificado' : 'permiso requerido no concedido'}
              </div>
              <p className="text-[13px] mt-1 text-ink">
                {autorizado
                  ? `Tu perfil tiene el permiso ${requiredPerm} para disparar este agente.`
                  : `Esta acción requiere el permiso ${requiredPerm} que no está concedido en tu perfil.`}
              </p>
              <div className="mono-label text-ink3 mt-1">
                permiso requerido: <span className="font-mono">{requiredPerm}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Action footer */}
      <div className="mt-5 flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-paper border border-rule">
        <div className="mono-label text-ink3 flex items-center gap-2">
          <I.Shield size={12} className="text-ok" />
          {a.estado === 'ejecutada'
            ? `ejecutada ${a.ejecutada_at} · resultado: enviado`
            : a.estado === 'rechazada'
              ? 'cerrada sin ejecutar · evidencia en audit log'
              : a.tipo === 'AGENTE_IA'
                ? 'borrador · disparará el agente al confirmar'
                : 'borrador · enviado desde tu correo institucional al confirmar'}
        </div>
        <div className="flex items-center gap-2">
          {a.estado === 'pendiente' && (
            <>
              <button
                onClick={onDescartar}
                className="px-3 py-1.5 text-[12.5px] text-ink2 hover:text-ink rounded-md hover:bg-rule/60">
                Descartar
              </button>
              <button
                onClick={onEjecutar}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-coral text-cream
                          hover:bg-coral-2 text-[12.5px] tracking-tight
                          shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                <I.Send size={12} /> {a.tipo === 'AGENTE_IA' ? 'Disparar agente' : 'Enviar correo'}
              </button>
            </>
          )}
          {a.estado === 'ejecutada' && (
            <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-md
                              bg-white border border-rule text-[12.5px]">
              Ver resultado <I.External size={12} />
            </button>
          )}
          {a.estado === 'rechazada' && (
            <button
              onClick={onReabrir}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md
                        bg-white border border-rule text-[12.5px] hover:border-navy/40">
              <I.Refresh size={12} /> Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Audit log — se mantiene en estado pero no se renderiza en la UI.
          Visible solo para auditores con permisos especiales (HU6.7). */}
    </div>
  );
}

function Card({ title, subtitle, mono, children }) {
  return (
    <div className="rounded-lg border border-rule bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <div>
          <div className="font-display text-[14px] tracking-tight">{title}</div>
          {subtitle && <div className="mono-label text-ink3 mt-0.5">{subtitle}</div>}
        </div>
        {mono && <span className="mono-label text-ink3">{mono}</span>}
      </header>
      <div>{children}</div>
    </div>
  );
}

function KvRow({ k, v, top }) {
  return (
    <div className={`grid grid-cols-[100px_1fr] gap-3 px-4 py-3 ${top ? 'items-start' : 'items-center'}`}>
      <div className="mono-label text-ink3 pt-0.5">{k}</div>
      <div className="text-[13.5px] text-ink min-w-0">{v}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CuerpoComposer — textarea enriquecida estilo chat para escribir el correo
// ════════════════════════════════════════════════════════════════════════════
function CuerpoComposer({ value, onChange }) {
  const insertAtCursor = (snippet) => {
    onChange((value || '') + snippet);
  };
  const wordCount = (value || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="rounded-md border border-rule bg-white focus-within:border-navy transition-colors">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-rule bg-paper text-ink3">
        <button onClick={() => insertAtCursor('\n\nSaludos cordiales,\nMatías')}
                title="Insertar despedida"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rule/60 text-[11px]">
          <I.Spark size={11} /> despedida
        </button>
        <button onClick={() => insertAtCursor('\n\nAdjunto la evidencia técnica para tu revisión.')}
                title="Insertar referencia a adjuntos"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rule/60 text-[11px]">
          <I.Paper size={11} /> ref. adjuntos
        </button>
        <span className="w-px h-4 bg-rule mx-1" />
        <button title="Tono formal" className="px-1.5 py-0.5 rounded hover:bg-rule/60 text-[11px]">
          tono formal
        </button>
        <button title="Tono conciso" className="px-1.5 py-0.5 rounded hover:bg-rule/60 text-[11px]">
          tono conciso
        </button>
        <span className="ml-auto mono-label text-ink3 normal-case tracking-normal text-[10px]">
          {wordCount} palabras
        </span>
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(6, Math.min(20, (value || '').split('\n').length + 1))}
        placeholder="Redacta el contenido del correo…"
        className="w-full bg-transparent px-3 py-2.5 font-sans text-[13.5px] leading-relaxed
                   text-ink placeholder:text-ink3 outline-none resize-none"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NewActionPanel — panel lateral derecho para crear nueva acción
// Tabs: Correo / Agente. Catálogo de agentes filtrado por permisos.
// ════════════════════════════════════════════════════════════════════════════
function NewActionPanel({ onClose, onCreate }) {
  const { caps } = useApp();
  const [tab, setTab] = useStateA('correo'); // 'correo' | 'agente'

  return (
    <aside className="fixed inset-y-0 right-0 w-[540px] bg-white border-l border-rule
                      shadow-[0_0_60px_-20px_rgba(10,37,64,.35)] flex flex-col z-30">
      <header className="px-5 py-4 border-b border-rule flex items-center justify-between">
        <div>
          <div className="mono-label text-ink3">crear acción</div>
          <h2 className="font-display text-[20px] tracking-tight mt-0.5">Nueva acción</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-md text-ink3 hover:text-ink hover:bg-rule/60">
          <I.X size={16} />
        </button>
      </header>

      <div className="px-5 py-3 border-b border-rule flex items-center gap-1">
        <TabBtn active={tab === 'correo'} onClick={() => setTab('correo')}>
          <I.Mail size={13} /> Correo institucional
        </TabBtn>
        <TabBtn active={tab === 'agente'} onClick={() => setTab('agente')}>
          <I.Robot size={13} /> Agente
        </TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto scroll-paper">
        {tab === 'correo' && <NewEmailForm caps={caps} onCreate={onCreate} />}
        {tab === 'agente' && <NewAgentList caps={caps} onCreate={onCreate} />}
      </div>
    </aside>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-[12.5px] transition-colors',
        active ? 'bg-navy text-cream' : 'text-ink2 hover:bg-rule/60',
      ].join(' ')}>
      {children}
    </button>
  );
}

function NewEmailForm({ caps, onCreate }) {
  const [destinatario, setDestinatario] = useStateA('');
  const [asunto, setAsunto] = useStateA('');
  const [cuerpo, setCuerpo] = useStateA('');

  const valid = destinatario && asunto && cuerpo;

  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <div className="mono-label text-ink3 mb-1.5">De</div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-paper border border-rule">
          <I.Shield size={12} className="text-ok" />
          <span className="font-mono text-[13px]">{caps.usuario.email_institucional}</span>
          <span className="mono-label text-ok bg-ok/10 rounded-sm px-1.5 py-0.5 normal-case tracking-wide ml-auto">
            verificado · institucional
          </span>
        </div>
        <div className="mono-label text-ink3 mt-1">
          el remitente lo provee el IdP de tu organización · no editable
        </div>
      </div>

      <div>
        <div className="mono-label text-ink3 mb-1.5">Para</div>
        <input
          type="email"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          placeholder="destinatario@empresa.cl"
          className="w-full bg-white border border-rule rounded-md px-3 py-2 font-mono text-[13px] outline-none focus:border-navy"
        />
      </div>

      <div>
        <div className="mono-label text-ink3 mb-1.5">Asunto</div>
        <input
          type="text"
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Asunto del correo"
          className="w-full bg-white border border-rule rounded-md px-3 py-2 text-[13.5px] outline-none focus:border-navy"
        />
      </div>

      <div>
        <div className="mono-label text-ink3 mb-1.5">Cuerpo</div>
        <CuerpoComposer value={cuerpo} onChange={setCuerpo} />
        <div className="mono-label text-ink3 mt-2 flex items-center gap-1.5">
          <I.Globe size={11} />
          idioma del correo · {caps.usuario.idioma === 'es' ? 'español' : caps.usuario.idioma === 'en' ? 'inglés' : 'portugués'} (preferencia de tu perfil)
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule">
        <button
          disabled={!valid}
          onClick={() => onCreate({
            tipo: 'ENVIAR_CORREO',
            titulo: asunto || 'Correo sin asunto',
            sub: `→ ${destinatario}`,
            parametros: { destinatario, asunto, cuerpo },
            adjuntos: [],
          })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-navy text-cream
                     hover:bg-navy-3 text-[12.5px] tracking-tight
                     disabled:bg-rule disabled:text-ink3 disabled:cursor-not-allowed
                     shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
          <I.Plus size={12} /> Crear borrador
        </button>
      </div>
    </div>
  );
}

function NewAgentList({ caps, onCreate }) {
  const habilitados = MOCK_AGENTES.filter((a) => caps.usuario.permisos.includes(a.permiso_requerido));
  const noHabilitados = MOCK_AGENTES.filter((a) => !caps.usuario.permisos.includes(a.permiso_requerido));

  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <I.Check size={13} className="text-ok" />
          <span className="mono-label text-ok">habilitados para tu perfil · {habilitados.length}</span>
        </div>
        <div className="space-y-2">
          {habilitados.map((agente) => (
            <AgenteCard key={agente.id} agente={agente} habilitado onCreate={onCreate} />
          ))}
          {habilitados.length === 0 && (
            <div className="text-[12.5px] text-ink3 px-3 py-2 rounded-md bg-paper border border-rule">
              No tienes permisos para disparar agentes.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <I.Lock size={13} className="text-ink3" />
          <span className="mono-label text-ink3">requieren permiso adicional · {noHabilitados.length}</span>
        </div>
        <div className="space-y-2">
          {noHabilitados.map((agente) => (
            <AgenteCard key={agente.id} agente={agente} habilitado={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgenteCard({ agente, habilitado, onCreate }) {
  return (
    <div className={[
      'rounded-md border p-3 transition-colors',
      habilitado ? 'border-rule bg-white hover:border-navy/30' : 'border-rule bg-paper/50 opacity-75',
    ].join(' ')}>
      <div className="flex items-start gap-2 mb-1">
        <I.Robot size={14} className={habilitado ? 'text-navy' : 'text-ink3'} />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] tracking-tight font-medium text-ink">{agente.nombre}</div>
          <div className="text-[12px] text-ink2 mt-0.5 leading-relaxed" style={{ textWrap: 'pretty' }}>
            {agente.descripcion}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-rule/60">
        <div className="mono-label text-ink3 flex items-center gap-2">
          <span>{agente.duracion}</span>
          <span>·</span>
          <span>impacto {agente.impacto}</span>
        </div>
        {habilitado ? (
          <button
            onClick={() => onCreate({
              tipo: 'AGENTE_IA',
              titulo: agente.nombre,
              sub: agente.descripcion,
              permiso_requerido: agente.permiso_requerido,
            })}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy text-cream
                       hover:bg-navy-3 text-[11.5px] tracking-tight transition-colors">
            Crear borrador <I.Chevron size={10} />
          </button>
        ) : (
          <span className="mono-label text-ink3 flex items-center gap-1">
            <I.Lock size={9} /> {agente.permiso_requerido}
          </span>
        )}
      </div>
    </div>
  );
}

window.ActionsView = ActionsView;
