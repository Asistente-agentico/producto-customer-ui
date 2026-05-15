import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  IconChevronDown,
  IconChevronRight,
  IconMessage2,
  IconTrash,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/stores/capabilities';
import { useConversacionesStore } from '@/stores/conversaciones';
import { crearConversacion, eliminarConversacion, listConversaciones } from '@/api/conversaciones';
import type { ConversacionListItem } from '@/api/types';
import { conversacionesQueryKey } from '@/features/conversaciones/queries';
import { groupByWeek, formatFechaCorta } from '@/lib/fecha-semana';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Sidebar jerárquico (PR 4 · handoff §3.3).
 *
 * Estructura: Brand → Ámbitos (autorizados del usuario) → Semanas
 * (últimas 4) → Temáticas (conversaciones, 1:1 según Q1) → Footer
 * con usuario.
 *
 * - Solo aparece en /chat (lo controla AppLayout).
 * - Ámbitos arrancan COLAPSADOS (handoff §3.1 "pantalla limpia").
 * - Conversaciones filtradas por `asistente_activo` (Q6).
 * - Si una conversación no trae `ambito_id`, cae al ámbito "otros"
 *   (no inventamos ámbito en cliente — Q2 dice que el central lo
 *   asigna server-side al crear).
 */
export default function Sidebar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);
  const asistenteActivoId = caps?.asistente_activo?.id;

  const query = useQuery({
    queryKey: conversacionesQueryKey,
    queryFn: () => listConversaciones(),
  });

  // Filtrar por asistente activo (Q6). Si no hay asistente activo,
  // mostrar todas (no romper UX en deployments sin esa info).
  const conversacionesVisibles = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!asistenteActivoId) return items;
    return items.filter((c) => !c.asistente_id || c.asistente_id === asistenteActivoId);
  }, [query.data, asistenteActivoId]);

  // Agrupar por ámbito autorizado.
  const ambitos = caps?.ambitos_autorizados ?? [];
  const conversacionesPorAmbito = useMemo(() => {
    const map = new Map<string, ConversacionListItem[]>();
    for (const conv of conversacionesVisibles) {
      const key = conv.ambito_id ?? 'otros';
      const list = map.get(key);
      if (list) list.push(conv);
      else map.set(key, [conv]);
    }
    return map;
  }, [conversacionesVisibles]);

  return (
    <>
      {open ? (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="md:hidden fixed inset-0 bg-black/50 z-20"
        />
      ) : null}

      <aside
        className={[
          'w-72 shrink-0 flex flex-col bg-navy text-cream',
          'fixed inset-y-0 left-0 z-30 transition-transform md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ width: 288 }}
        aria-label="Navegación principal"
      >
        <Brand onClose={onClose} mobile />

        <div className="flex-1 overflow-y-auto">
          {ambitos.length === 0 ? (
            <p className="px-4 py-6 text-[11px] text-cream/60">{t('comun.cargando')}</p>
          ) : (
            ambitos.map((amb) => {
              const lista = conversacionesPorAmbito.get(amb.id) ?? [];
              return (
                <AmbitoPanel
                  key={amb.id}
                  ambitoId={amb.id}
                  nombre={amb.nombre}
                  conversaciones={lista}
                />
              );
            })
          )}
          {/* "Otros" si hay conversaciones sin ámbito (defensivo). */}
          {conversacionesPorAmbito.has('otros') ? (
            <AmbitoPanel
              ambitoId="otros"
              nombre="Otros"
              conversaciones={conversacionesPorAmbito.get('otros') ?? []}
            />
          ) : null}
        </div>

        <UserFooter />
      </aside>
    </>
  );
}

function Brand({ onClose, mobile }: { onClose: () => void; mobile?: boolean }) {
  const caps = useCapabilities((s) => s.capabilities);
  const titulo = caps?.ui.titulo ?? 'Asistentes Virtuales';
  const emoji = caps?.ui.icono_emoji;
  const letras = caps?.ui.logo_letras ?? caps?.ui.icono_sistema ?? 'AV';
  const subtitulo = caps?.ui.subtitulo ?? 'tu apoyo operativo';
  return (
    <header className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-cream/10">
      <div
        aria-hidden="true"
        className="w-10 h-10 rounded-md bg-cream text-navy flex items-center justify-center font-semibold"
      >
        {emoji ?? letras}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] leading-tight tracking-tight text-cream">{titulo}</p>
        <p className="mt-0.5 text-[11px] text-cream/70 truncate">{subtitulo}</p>
      </div>
      {mobile ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="md:hidden min-w-[44px] min-h-[44px] grid place-items-center rounded hover:bg-cream/10 text-cream"
        >
          <IconX size={16} aria-hidden="true" />
        </button>
      ) : null}
    </header>
  );
}

function UserFooter() {
  const caps = useCapabilities((s) => s.capabilities);
  const nombre = caps?.usuario.nombre ?? caps?.usuario.id_pseudo;
  const rol = caps?.usuario.rol;
  const gerencia = caps?.usuario.gerencia;
  return (
    <footer className="border-t border-cream/10 px-4 py-3">
      <p className="text-[13px] text-cream font-medium tracking-tight truncate">{nombre ?? '—'}</p>
      <p className="text-[11px] text-cream/70 mt-0.5 truncate">
        {[rol, gerencia].filter(Boolean).join(' · ')}
      </p>
    </footer>
  );
}

function AmbitoPanel({
  ambitoId,
  nombre,
  conversaciones,
}: {
  ambitoId: string;
  nombre: string;
  conversaciones: ConversacionListItem[];
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setLast = useConversacionesStore((s) => s.setLast);
  const asistenteActivoId = useCapabilities((s) => s.capabilities?.asistente_activo?.id);

  const buckets = useMemo(
    () => groupByWeek(conversaciones, (c) => c.creado_en, 4),
    [conversaciones],
  );

  const crear = useMutation({
    mutationFn: () =>
      crearConversacion({
        ambito_id: ambitoId === 'otros' ? undefined : ambitoId,
        asistente_id: asistenteActivoId,
      }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey });
      setLast(id);
      navigate(`/chat/${id}`);
    },
  });

  return (
    <div className="border-b border-cream/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-cream hover:bg-cream/5"
      >
        {open ? (
          <IconChevronDown size={13} className="text-cream/70 shrink-0" aria-hidden="true" />
        ) : (
          <IconChevronRight size={13} className="text-cream/70 shrink-0" aria-hidden="true" />
        )}
        <span className="flex-1 font-display text-[14px] tracking-tight">{nombre}</span>
        <span className="font-mono text-[11px] tabular-nums text-cream/85 bg-cream/15 rounded px-1.5 py-0.5 min-w-[24px] text-center">
          {conversaciones.length}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            crear.mutate();
          }}
          disabled={crear.isPending}
          aria-label={`${t('chat.nueva_conversacion')} en ${nombre}`}
          title={t('chat.nueva_conversacion')}
          className="p-1 rounded hover:bg-cream/15 text-cream/70 hover:text-cream disabled:opacity-50"
        >
          <IconPlus size={12} aria-hidden="true" />
        </button>
      </button>
      {open ? (
        <div className="py-1 bg-black/10">
          {buckets.length === 0 ? (
            <p className="px-6 py-3 text-[11px] text-cream/55">
              Sin conversaciones en este ámbito.
            </p>
          ) : (
            buckets.map((b) => (
              <div key={b.semana}>
                <p className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-cream/55">
                  {b.semana}
                </p>
                {b.items.map((c) => (
                  <TematicaItem key={c.id} conv={c} />
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function TematicaItem({ conv }: { conv: ConversacionListItem }) {
  const { conversacionId } = useParams();
  const queryClient = useQueryClient();
  const setLast = useConversacionesStore((s) => s.setLast);
  const navigate = useNavigate();
  const eliminar = useMutation({
    mutationFn: () => eliminarConversacion(conv.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey });
      if (conversacionId === conv.id) {
        setLast(null);
        navigate('/chat');
      }
    },
  });
  const active = conversacionId === conv.id;
  return (
    <div
      className={[
        'group flex items-start gap-2 px-4 py-2 text-left',
        active ? 'bg-cream/15' : 'hover:bg-cream/10',
      ].join(' ')}
    >
      <NavLink
        to={`/chat/${conv.id}`}
        onClick={() => setLast(conv.id)}
        className="flex-1 min-w-0 flex items-start gap-2"
      >
        <IconMessage2 size={11} className="text-cream/55 shrink-0 mt-1" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono text-cream/70 mb-0.5">
            {formatFechaCorta(conv.creado_en)}
          </p>
          <p className="text-[13px] text-cream tracking-tight leading-snug truncate">
            {conv.titulo}
          </p>
        </div>
      </NavLink>
      <button
        type="button"
        onClick={() => {
          if (confirm(`¿Eliminar "${conv.titulo}"?`)) eliminar.mutate();
        }}
        disabled={eliminar.isPending}
        aria-label={`Eliminar ${conv.titulo}`}
        title="Eliminar"
        className="opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100 p-1 text-cream/70 hover:text-coral"
      >
        <IconTrash size={11} aria-hidden="true" />
      </button>
    </div>
  );
}
