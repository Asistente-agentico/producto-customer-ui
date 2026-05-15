import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconMail,
  IconRobot,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconLock,
} from '@tabler/icons-react';
import { actualizarAccion, descartarAccion, ejecutarAccion, obtenerAccion } from '@/api/acciones';
import { useCapabilities } from '@/stores/capabilities';
import { auditEvent } from '@/api/audit';
import { ACCIONES_QUERY_KEY } from './AccionesPage';
import type { EstadoAccion } from '@/api/types';

const ESTADO_COLOR: Record<EstadoAccion, { text: string; bg: string }> = {
  pendiente: { text: 'text-ink2', bg: 'bg-rule/60' },
  ejecutada: { text: 'text-ok', bg: 'bg-ok/10' },
  rechazada: { text: 'text-ink3', bg: 'bg-rule/60' },
  fallida: { text: 'text-coral', bg: 'bg-coral/10' },
};

type Props = { id: string };

/**
 * Detalle de la acción seleccionada. Muestra parámetros, audit log
 * timeline, y botones de Editar/Ejecutar/Descartar según estado.
 *
 * Q5 · Toda la confirmación pasa por acá (no más inline en chat).
 * Q11 · Para ENVIAR_CORREO, "from" es read-only y se setea desde
 * `caps.usuario.email_institucional`. Campo de adjuntos oculto.
 */
export default function AccionDetalle({ id }: Props) {
  const queryClient = useQueryClient();
  const caps = useCapabilities((s) => s.capabilities);
  const emailUser = caps?.usuario.email_institucional;
  const idiomaUser = caps?.usuario.idioma ?? caps?.usuario.idioma ?? 'es';

  const query = useQuery({
    queryKey: ['accion', id] as const,
    queryFn: () => obtenerAccion(id),
  });

  const accion = query.data;
  const editable = accion?.estado === 'pendiente';

  const [params, setParams] = useState<Record<string, unknown>>({});
  // Sync params cuando cambia la acción.
  useMemo(() => {
    if (accion) setParams(accion.parametros);
  }, [accion]);

  const ejecutar = useMutation({
    mutationFn: async () => {
      if (editable) {
        await actualizarAccion(id, { parametros: params });
      }
      return ejecutarAccion(id);
    },
    onSuccess: (a) => {
      queryClient.setQueryData(['accion', id], a);
      queryClient.invalidateQueries({ queryKey: ACCIONES_QUERY_KEY });
      void auditEvent({
        evento: 'accion_ejecutada',
        recurso: id,
        metadata: { tipo: a.tipo },
      });
    },
  });

  const descartar = useMutation({
    mutationFn: () => descartarAccion(id),
    onSuccess: (a) => {
      queryClient.setQueryData(['accion', id], a);
      queryClient.invalidateQueries({ queryKey: ACCIONES_QUERY_KEY });
    },
  });

  if (query.isLoading) return <p className="text-sm text-ink2">Cargando acción...</p>;
  if (!accion) {
    return (
      <p role="alert" className="text-sm text-coral">
        No se pudo cargar la acción.
      </p>
    );
  }

  const isCorreo = accion.tipo === 'ENVIAR_CORREO';
  const Icon = isCorreo ? IconMail : IconRobot;
  const colorEstado = ESTADO_COLOR[accion.estado];

  // Validación visual de permisos para AGENTE_IA (Q11 + handoff §3.7).
  const permisoOk =
    !accion.permiso_requerido || (caps?.usuario.permisos ?? []).includes(accion.permiso_requerido);

  // Para ENVIAR_CORREO: si los params no traen `from`, lo seteamos
  // del JWT al editar. NUNCA editable (Q11.7).
  const fromValue = isCorreo ? emailUser : undefined;

  return (
    <article className="max-w-3xl">
      <header className="flex items-start gap-3 mb-4">
        <Icon size={24} className="shrink-0 text-ink2 mt-1" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink3">{accion.tipo}</p>
          <h3 className="font-display text-xl font-semibold tracking-tight">{accion.titulo}</h3>
          {accion.sub ? <p className="text-sm text-ink2 mt-0.5">{accion.sub}</p> : null}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-[10px] uppercase tracking-wider rounded-sm px-1.5 py-0.5 ${colorEstado.text} ${colorEstado.bg}`}
            >
              {accion.estado}
            </span>
            {accion.origen ? <span className="text-[11px] text-ink3">{accion.origen}</span> : null}
          </div>
        </div>
      </header>

      {!permisoOk && editable ? (
        <div
          role="alert"
          className="mb-3 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] flex items-center gap-2"
        >
          <IconLock size={14} className="text-coral" aria-hidden="true" />
          Esta acción requiere el permiso{' '}
          <code className="font-mono">{accion.permiso_requerido}</code>, que no tenés asignado. El
          backend rechazará la ejecución.
        </div>
      ) : null}

      {/* Parámetros · editables solo si pendiente (Q11 oculta adjuntos) */}
      <section aria-label="Parámetros" className="rounded-md border border-rule bg-paper p-4">
        {isCorreo ? (
          <CorreoForm
            params={params}
            setParams={setParams}
            editable={editable}
            from={fromValue ?? ''}
            idioma={idiomaUser}
          />
        ) : (
          <AgenteParams params={params} setParams={setParams} editable={editable} />
        )}
      </section>

      {/* Audit log · timeline */}
      <section aria-label="Audit log" className="mt-4">
        <header className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] uppercase tracking-wider text-ink3">Audit log</h4>
          <p className="text-[10px] text-ink3">Retención por rol — política del producto</p>
        </header>
        <ol className="rounded-md border border-rule bg-paper">
          {accion.audit.map((e, i) => {
            const last = i === accion.audit.length - 1;
            return (
              <li key={`${e.ts}-${i}`} className="px-4 py-2 border-b border-rule/60 last:border-0">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 ${last ? 'bg-coral' : 'bg-ink3'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-ink">
                      <span className="font-medium">{e.accion}</span>{' '}
                      <span className="text-ink3">· {e.actor}</span>
                    </p>
                    {e.detalle ? <p className="text-[11px] text-ink2 mt-0.5">{e.detalle}</p> : null}
                    <p className="text-[10px] text-ink3 font-mono mt-0.5">
                      {new Date(e.ts).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Acciones · solo si pendiente */}
      {editable ? (
        <footer className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => descartar.mutate()}
            disabled={descartar.isPending || ejecutar.isPending}
            className="h-9 px-3 rounded-md border border-rule text-ink2 hover:border-navy/40 hover:text-ink text-sm inline-flex items-center gap-1 disabled:opacity-50"
          >
            <IconX size={14} aria-hidden="true" />
            Descartar
          </button>
          <button
            type="button"
            onClick={() => ejecutar.mutate()}
            disabled={ejecutar.isPending || descartar.isPending || !permisoOk}
            className="h-9 px-3 rounded-md bg-coral text-paper text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <IconCheck size={14} aria-hidden="true" />
            {ejecutar.isPending ? 'Ejecutando...' : isCorreo ? 'Enviar correo' : 'Disparar agente'}
          </button>
        </footer>
      ) : null}

      {ejecutar.isError ? (
        <p role="alert" className="mt-3 text-[12px] text-coral inline-flex items-center gap-1">
          <IconAlertTriangle size={12} aria-hidden="true" />
          {ejecutar.error instanceof Error ? ejecutar.error.message : 'Error al ejecutar.'}
        </p>
      ) : null}
    </article>
  );
}

function CorreoForm({
  params,
  setParams,
  editable,
  from,
  idioma,
}: {
  params: Record<string, unknown>;
  setParams: (p: Record<string, unknown>) => void;
  editable: boolean;
  from: string;
  idioma: string;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <FieldReadonly
        label="De · correo institucional"
        value={from || '—'}
        hint="read-only · verificado por el JWT"
      />
      <Field
        label="Para"
        editable={editable}
        type="email"
        value={String(params['destinatario'] ?? '')}
        onChange={(v) => setParams({ ...params, destinatario: v })}
      />
      <Field
        label="Asunto"
        editable={editable}
        type="text"
        value={String(params['asunto'] ?? '')}
        onChange={(v) => setParams({ ...params, asunto: v })}
      />
      <FieldTextarea
        label="Cuerpo"
        editable={editable}
        value={String(params['cuerpo'] ?? '')}
        onChange={(v) => setParams({ ...params, cuerpo: v })}
      />
      {/* Q11.4 · Campo Adjuntos OCULTO. No se renderiza. */}
      <p className="text-[11px] text-ink3">
        🌐 idioma del correo · {idiomaLabel(idioma)} (preferencia de tu perfil)
      </p>
    </div>
  );
}

function AgenteParams({
  params,
  setParams,
  editable,
}: {
  params: Record<string, unknown>;
  setParams: (p: Record<string, unknown>) => void;
  editable: boolean;
}) {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return (
      <p className="text-[12px] text-ink3 italic">Esta acción no tiene parámetros configurables.</p>
    );
  }
  return (
    <div className="grid gap-3 text-sm">
      {entries.map(([k, v]) => (
        <Field
          key={k}
          label={k}
          editable={editable}
          type="text"
          value={String(v ?? '')}
          onChange={(val) => setParams({ ...params, [k]: val })}
        />
      ))}
    </div>
  );
}

function Field({
  label,
  editable,
  type,
  value,
  onChange,
}: {
  label: string;
  editable: boolean;
  type: 'text' | 'email';
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-ink3">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={!editable}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'mt-1 block w-full rounded-md border border-rule px-2 py-1.5 text-sm',
          editable ? 'bg-paper' : 'bg-cream/40 text-ink2',
        ].join(' ')}
      />
    </label>
  );
}

function FieldTextarea({
  label,
  editable,
  value,
  onChange,
}: {
  label: string;
  editable: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-ink3">{label}</span>
      <textarea
        value={value}
        readOnly={!editable}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className={[
          'mt-1 block w-full rounded-md border border-rule px-2 py-1.5 text-sm whitespace-pre-wrap',
          editable ? 'bg-paper' : 'bg-cream/40 text-ink2',
        ].join(' ')}
      />
    </label>
  );
}

function FieldReadonly({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-wider text-ink3">{label}</span>
      <p className="font-mono text-sm text-ink mt-1">{value}</p>
      {hint ? <p className="text-[10px] text-ink3 mt-0.5">{hint}</p> : null}
    </div>
  );
}

function idiomaLabel(lang: string): string {
  if (lang === 'en') return 'inglés';
  if (lang === 'pt') return 'portugués';
  return 'español';
}
