import { type FormEvent, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IconMail, IconRobot, IconX, IconLock, IconCheck } from '@tabler/icons-react';
import { crearAccion, fetchCatalogoAgentes } from '@/api/acciones';
import { useCapabilities } from '@/stores/capabilities';
import { ACCIONES_QUERY_KEY } from './AccionesPage';

type Props = { onClose: () => void };

/**
 * Panel "+ Nueva" con 2 tabs (handoff §3.7 + Q11):
 *
 * - **Correo institucional**: De (read-only del JWT), Para, Asunto,
 *   Cuerpo. Indicador del idioma. **SIN campo Adjuntos** (Q11.4 ·
 *   oculto · si hace falta compartir datos se usa el módulo Reportes).
 *
 * - **Agente**: catálogo filtrado por permisos del usuario; tarjeta
 *   habilitada si el permiso del agente está en `usuario.permisos`,
 *   deshabilitada con candado si no.
 */
export default function NewActionPanel({ onClose }: Props) {
  const [tab, setTab] = useState<'correo' | 'agente'>('correo');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nueva acción"
      className="fixed inset-0 z-40 flex"
    >
      <div aria-hidden="true" onClick={onClose} className="flex-1 bg-black/30" />
      <aside className="w-full max-w-md bg-paper border-l border-rule overflow-y-auto flex flex-col">
        <header className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Nueva acción</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="min-w-[36px] min-h-[36px] grid place-items-center rounded text-ink2 hover:text-ink hover:bg-cream/50"
          >
            <IconX size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="flex border-b border-rule">
          <TabBtn active={tab === 'correo'} onClick={() => setTab('correo')}>
            <IconMail size={14} aria-hidden="true" /> Correo institucional
          </TabBtn>
          <TabBtn active={tab === 'agente'} onClick={() => setTab('agente')}>
            <IconRobot size={14} aria-hidden="true" /> Agente
          </TabBtn>
        </div>

        <div className="flex-1 p-4">
          {tab === 'correo' ? <CorreoTab onCreated={onClose} /> : <AgenteTab onCreated={onClose} />}
        </div>
      </aside>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-[13px]',
        active
          ? 'text-coral border-b-2 border-coral -mb-px font-medium'
          : 'text-ink2 hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function CorreoTab({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const caps = useCapabilities((s) => s.capabilities);
  const emailUser = caps?.usuario.email_institucional ?? '—';
  const idioma = caps?.usuario.idioma ?? 'es';

  const [destinatario, setDestinatario] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');

  const crear = useMutation({
    mutationFn: () =>
      crearAccion({
        tipo: 'ENVIAR_CORREO',
        titulo: asunto || 'Correo institucional',
        sub: `Para: ${destinatario}`,
        origen: 'Manual · "+ Nueva"',
        parametros: { destinatario, asunto, cuerpo },
      }),
    onSuccess: (a) => {
      queryClient.invalidateQueries({ queryKey: ACCIONES_QUERY_KEY });
      navigate(`/acciones/${a.id}`);
      onCreated();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!destinatario || !asunto || !cuerpo) return;
    crear.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 text-sm">
      <div className="rounded-md border border-rule bg-cream/40 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wider text-ink3">De</p>
        <p className="font-mono text-[13px] text-ink mt-0.5">{emailUser}</p>
        <p className="text-[10px] text-ink3 mt-0.5">
          correo institucional · verificado por el JWT (read-only)
        </p>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-ink3">Para</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          className="mt-1 block w-full rounded-md border border-rule bg-paper px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-ink3">Asunto</span>
        <input
          type="text"
          required
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          className="mt-1 block w-full rounded-md border border-rule bg-paper px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-ink3">Cuerpo</span>
        <textarea
          required
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          rows={6}
          placeholder="Redacta el contenido del correo..."
          className="mt-1 block w-full rounded-md border border-rule bg-paper px-2 py-1.5 text-sm"
        />
      </label>

      {/* Q11.4 · Campo Adjuntos OCULTO. Si necesitás compartir datos
          adjuntos, el flujo es generar un reporte desde el módulo
          Reportes y compartir el link. */}

      <p className="text-[11px] text-ink3">🌐 idioma del correo · {idiomaLabel(idioma)}</p>

      {crear.isError ? (
        <p role="alert" className="text-[12px] text-coral">
          {crear.error instanceof Error ? crear.error.message : 'Error al crear el borrador.'}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 mt-1">
        <button
          type="button"
          onClick={onCreated}
          className="h-9 px-3 rounded-md border border-rule text-ink2 text-sm hover:border-navy/40"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={crear.isPending || !destinatario || !asunto || !cuerpo}
          className="h-9 px-3 rounded-md bg-coral text-paper text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear borrador'}
        </button>
      </div>
    </form>
  );
}

function AgenteTab({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const caps = useCapabilities((s) => s.capabilities);
  const permisos = new Set(caps?.usuario.permisos ?? []);

  const query = useQuery({
    queryKey: ['acciones', 'catalogo-agentes'],
    queryFn: fetchCatalogoAgentes,
  });

  const crear = useMutation({
    mutationFn: (agente: {
      id: string;
      nombre: string;
      descripcion?: string;
      permiso_requerido: string;
      estimado?: string;
    }) =>
      crearAccion({
        tipo: 'AGENTE_IA',
        titulo: agente.nombre,
        sub: agente.descripcion,
        origen: 'Manual · catálogo de agentes',
        permiso_requerido: agente.permiso_requerido,
        parametros: { agente_id: agente.id },
      }),
    onSuccess: (a) => {
      queryClient.invalidateQueries({ queryKey: ACCIONES_QUERY_KEY });
      navigate(`/acciones/${a.id}`);
      onCreated();
    },
  });

  if (query.isLoading) return <p className="text-sm text-ink2">Cargando catálogo...</p>;
  const agentes = query.data ?? [];

  const habilitados = agentes.filter((a) => permisos.has(a.permiso_requerido));
  const noHabilitados = agentes.filter((a) => !permisos.has(a.permiso_requerido));

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink3">
        Catálogo configurado por tu cliente. Las tarjetas habilitadas son las que tu rol puede
        disparar.
      </p>

      {habilitados.length > 0 ? (
        <section>
          <h4 className="text-[10px] uppercase tracking-wider text-ink3 mb-2 inline-flex items-center gap-1">
            <IconCheck size={11} className="text-ok" aria-hidden="true" /> Habilitados (
            {habilitados.length})
          </h4>
          <ul className="grid gap-2">
            {habilitados.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => crear.mutate(a)}
                  disabled={crear.isPending}
                  className="w-full text-left rounded-md border border-rule bg-paper hover:border-coral/40 p-3 disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-ink">{a.nombre}</p>
                  {a.descripcion ? (
                    <p className="text-[12px] text-ink2 mt-0.5">{a.descripcion}</p>
                  ) : null}
                  {a.estimado ? (
                    <p className="text-[10px] text-ink3 mt-1 font-mono">{a.estimado}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {noHabilitados.length > 0 ? (
        <section>
          <h4 className="text-[10px] uppercase tracking-wider text-ink3 mb-2 inline-flex items-center gap-1">
            <IconLock size={11} aria-hidden="true" /> No habilitados ({noHabilitados.length})
          </h4>
          <ul className="grid gap-2 opacity-60">
            {noHabilitados.map((a) => (
              <li key={a.id}>
                <div className="rounded-md border border-rule p-3 cursor-not-allowed">
                  <p className="text-sm font-medium text-ink2">{a.nombre}</p>
                  {a.descripcion ? (
                    <p className="text-[12px] text-ink3 mt-0.5">{a.descripcion}</p>
                  ) : null}
                  <p className="text-[10px] text-ink3 mt-1">
                    requiere permiso <code className="font-mono">{a.permiso_requerido}</code>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {crear.isError ? (
        <p role="alert" className="text-[12px] text-coral">
          {crear.error instanceof Error ? crear.error.message : 'Error al crear la acción.'}
        </p>
      ) : null}
    </div>
  );
}

function idiomaLabel(lang: string): string {
  if (lang === 'en') return 'inglés';
  if (lang === 'pt') return 'portugués';
  return 'español';
}
