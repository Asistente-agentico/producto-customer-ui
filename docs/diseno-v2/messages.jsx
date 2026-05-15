// Messages — user turn (right, no bubble) + assistant turn (left, mono ID)

function UserTurn({ children, time = '14:31' }) {
  return (
    <div className="rise flex justify-end">
      <div className="max-w-[640px] text-right">
        <div className="mono-label text-ink3 mb-1.5">tú · {time}</div>
        <p className="font-display text-[19px] leading-[1.45] tracking-tight text-ink">
          {children}
        </p>
      </div>
    </div>
  );
}

function AssistantTurn({ id, children, time = '14:32', streaming = false }) {
  return (
    <div className="rise flex" style={{ animationDelay: '.05s' }}>
      <div className="max-w-[720px] w-full">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-coral pulse-dot" />
          <span className="mono-label text-ink2">
            asistente.engorda <span className="text-ink3">· run #a7c1 · {time}</span>
          </span>
          {streaming && <span className="mono-label text-ok ml-1">streaming</span>}
        </div>
        <div className="space-y-4 text-[15px] leading-[1.65] text-ink">
          {children}
        </div>
      </div>
    </div>
  );
}

function P({ children }) {
  return <p className="text-[15px] leading-[1.65] text-ink/90" style={{ textWrap: 'pretty' }}>{children}</p>;
}

function Inline({ children }) {
  return <span className="font-mono text-[13.5px] bg-rule/60 px-1.5 py-0.5 rounded">{children}</span>;
}

function MessageThread() {
  return (
    <div className="space-y-9">
      <UserTurn time="14:31">
        Revisa la mortalidad de CTR-007 jaula 4 en los últimos 14 días, dime qué la
        está causando y prepara una notificación al jefe de centro si corresponde.
      </UserTurn>

      <AssistantTurn id="a7c1" time="14:32">
        <P>
          Mortalidad en <Inline>CTR-007</Inline> jaula 4 viene escalando desde el
          08&nbsp;may. Hoy registramos <strong className="font-semibold">27 unidades</strong>,
          un <span className="text-coral font-medium">+38%</span> sobre el promedio
          de la semana anterior y fuera de la zona objetivo (8–14/día).
        </P>

        <LineChart />

        <P>
          Buscando correlatos en las series ambientales del centro, encuentro una
          señal causal clara con la oxigenación:
        </P>

        <CausalAlert />

        <P>
          Dado el patrón y la severidad, sugiero notificar a{' '}
          <Inline>Hugo Salinas</Inline>, jefe de centro, con la evidencia adjunta y
          una propuesta de revisión de aireadores + muestreo branquial mañana AM.
          Borrador listo para revisar:
        </P>

        <ActionCard />

        <P className="text-ink2">
          ¿Quieres que también genere un seguimiento para el equipo veterinario o
          deje esto pendiente hasta tener respuesta de Hugo?
        </P>
      </AssistantTurn>
    </div>
  );
}

window.MessageThread = MessageThread;
