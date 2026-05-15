import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconMail, IconRobot, IconBolt, IconPlus } from '@tabler/icons-react';
import { useCapabilities } from '@/stores/capabilities';
import { listAcciones } from '@/api/acciones';
import type { Accion, EstadoAccion } from '@/api/types';
import AccionDetalle from './AccionDetalle';
import NewActionPanel from './NewActionPanel';

/* eslint-disable react-refresh/only-export-components --
   ACCIONES_QUERY_KEY se exporta para invalidar la query desde otros
   componentes del módulo (Detalle, NewActionPanel). */

export const ACCIONES_QUERY_KEY = ['acciones'] as const;

export function useInvalidateAcciones() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ACCIONES_QUERY_KEY });
}

/**
 * Vista del módulo Acciones (handoff §3.7 + Q5 + Q11).
 *
 * Layout: cola lateral 320px (agrupada por estado) + panel principal
 * con detalle de la acción seleccionada. Botón "+ Nueva" abre panel
 * con 2 tabs (Correo institucional / Agente).
 *
 * - Sin doble custodia. Sin "esperando aprobación". Estados: pendiente,
 *   ejecutada, rechazada, fallida.
 * - Q11 · sin adjuntos en correos. El composer no expone el campo.
 */
export default function AccionesPage() {
  const { id: idFromUrl } = useParams();
  const navigate = useNavigate();
  const enabled = useCapabilities((s) => s.capabilities?.modulos.acciones?.enabled === true);
  const [newOpen, setNewOpen] = useState(false);

  const query = useQuery({
    queryKey: ACCIONES_QUERY_KEY,
    queryFn: () => listAcciones(),
    enabled,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const selectedId = idFromUrl ?? items.find((a) => a.estado === 'pendiente')?.id ?? items[0]?.id;

  useEffect(() => {
    if (!idFromUrl && selectedId) {
      navigate(`/acciones/${selectedId}`, { replace: true });
    }
  }, [idFromUrl, selectedId, navigate]);

  if (!enabled) {
    return (
      <section className="p-6">
        <h2 className="font-display text-lg font-semibold">Acciones</h2>
        <p className="text-sm text-ink2 mt-2">
          El módulo de Acciones no está habilitado en este deployment.
        </p>
      </section>
    );
  }

  return (
    <section className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-rule flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Acciones</h2>
          <p className="text-sm text-ink2">Seguimiento de acciones.</p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="h-9 px-3 rounded-md bg-coral text-paper text-sm font-medium hover:opacity-90 inline-flex items-center gap-2"
        >
          <IconPlus size={14} aria-hidden="true" />
          Nueva
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Mobile · si hay acción seleccionada, ocultamos la cola y
            mostramos solo el detalle (botón "← Volver a la cola").
            Desktop (md:) · ambas columnas visibles. */}
        <div className={idFromUrl ? 'hidden md:block' : 'block w-full md:w-auto'}>
          <ColaLateral
            items={items}
            selectedId={selectedId}
            onSelect={(id) => navigate(`/acciones/${id}`)}
          />
        </div>
        <main
          className={[
            'flex-1 overflow-auto min-w-0 p-4 md:p-6',
            idFromUrl ? 'block' : 'hidden md:block',
          ].join(' ')}
        >
          {idFromUrl ? (
            <button
              type="button"
              onClick={() => navigate('/acciones')}
              className="md:hidden mb-3 text-[12px] text-coral underline hover:opacity-80"
            >
              ← Volver a la cola
            </button>
          ) : null}
          {query.isLoading ? (
            <p className="text-sm text-ink2">Cargando...</p>
          ) : query.isError ? (
            <p role="alert" className="text-sm text-coral">
              {String(query.error)}
            </p>
          ) : selectedId ? (
            <AccionDetalle id={selectedId} />
          ) : (
            <EmptyHint onClickNueva={() => setNewOpen(true)} />
          )}
        </main>
      </div>

      {newOpen ? <NewActionPanel onClose={() => setNewOpen(false)} /> : null}
    </section>
  );
}

const ESTADO_LABEL: Record<EstadoAccion, string> = {
  pendiente: 'Pendientes',
  ejecutada: 'Ejecutadas',
  rechazada: 'Rechazadas',
  fallida: 'Fallidas',
};

const ESTADO_DOT: Record<EstadoAccion, string> = {
  pendiente: 'bg-ink3',
  ejecutada: 'bg-ok',
  rechazada: 'bg-ink3',
  fallida: 'bg-coral',
};

const ORDEN_ESTADOS: EstadoAccion[] = ['pendiente', 'ejecutada', 'rechazada', 'fallida'];

function ColaLateral({
  items,
  selectedId,
  onSelect,
}: {
  items: Accion[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const porEstado = useMemo(() => {
    const m: Record<EstadoAccion, Accion[]> = {
      pendiente: [],
      ejecutada: [],
      rechazada: [],
      fallida: [],
    };
    for (const a of items) m[a.estado].push(a);
    return m;
  }, [items]);

  return (
    <aside className="w-full md:w-[320px] md:shrink-0 border-r border-rule overflow-auto bg-cream/30">
      {ORDEN_ESTADOS.map((estado) => {
        const list = porEstado[estado];
        if (list.length === 0) return null;
        return (
          <section key={estado} className="border-b border-rule/60">
            <header className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${ESTADO_DOT[estado]}`}
              />
              <p className="text-[10px] uppercase tracking-wider text-ink3 flex-1">
                {ESTADO_LABEL[estado]}
              </p>
              <span className="text-[10px] font-mono text-ink3">{list.length}</span>
            </header>
            <ul>
              {list.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    aria-current={selectedId === a.id ? 'page' : undefined}
                    className={[
                      'w-full text-left px-4 py-2.5 flex items-start gap-2 hover:bg-paper',
                      selectedId === a.id ? 'bg-paper border-l-2 border-coral' : '',
                    ].join(' ')}
                  >
                    <TipoIcon tipo={a.tipo} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-ink tracking-tight truncate">{a.titulo}</p>
                      {a.sub ? (
                        <p className="text-[11px] text-ink3 truncate mt-0.5">{a.sub}</p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {items.length === 0 ? (
        <p className="px-4 py-6 text-[12px] text-ink3">No hay acciones.</p>
      ) : null}
    </aside>
  );
}

function TipoIcon({ tipo }: { tipo: 'ENVIAR_CORREO' | 'AGENTE_IA' }) {
  const Icon = tipo === 'ENVIAR_CORREO' ? IconMail : tipo === 'AGENTE_IA' ? IconRobot : IconBolt;
  return <Icon size={14} className="shrink-0 text-ink2 mt-0.5" aria-hidden="true" />;
}

function EmptyHint({ onClickNueva }: { onClickNueva: () => void }) {
  return (
    <div className="h-full grid place-items-center text-center">
      <div>
        <p className="text-sm text-ink2">Elegí una acción de la cola para ver su detalle.</p>
        <button
          type="button"
          onClick={onClickNueva}
          className="mt-3 text-[12px] text-coral underline hover:opacity-80"
        >
          o creá una nueva acción
        </button>
      </div>
    </div>
  );
}
