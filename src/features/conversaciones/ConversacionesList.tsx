import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconTrash, IconMessage2 } from '@tabler/icons-react';
import { crearConversacion, eliminarConversacion, listConversaciones } from '@/api/conversaciones';
import { useConversacionesStore } from '@/stores/conversaciones';
import { conversacionesQueryKey } from './queries';

export default function ConversacionesList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { conversacionId } = useParams();
  const setLast = useConversacionesStore((s) => s.setLast);

  const query = useQuery({
    queryKey: conversacionesQueryKey,
    queryFn: () => listConversaciones(),
  });

  const crear = useMutation({
    mutationFn: () => crearConversacion({}),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey });
      setLast(id);
      navigate(`/chat/${id}`);
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarConversacion(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey });
      if (conversacionId === id) {
        setLast(null);
        navigate('/chat');
      }
    },
  });

  const items = query.data?.items ?? [];

  return (
    <section aria-label="Conversaciones">
      <header className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-xs uppercase opacity-50">Conversaciones</h2>
        <button
          type="button"
          onClick={() => crear.mutate()}
          disabled={crear.isPending}
          className="p-1 rounded hover:bg-white/10 disabled:opacity-50"
          aria-label={t('chat.nueva_conversacion')}
          title={t('chat.nueva_conversacion')}
        >
          <IconPlus size={14} aria-hidden="true" />
        </button>
      </header>

      {query.isLoading ? (
        <p className="px-2 text-xs opacity-60">{t('comun.cargando')}</p>
      ) : items.length === 0 ? (
        <p className="px-2 text-xs opacity-60">Sin conversaciones todavía.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((c) => (
            <li key={c.id}>
              <div
                className={[
                  'group flex items-center gap-1 rounded',
                  conversacionId === c.id ? 'bg-white/10' : 'hover:bg-white/5',
                ].join(' ')}
              >
                <NavLink
                  to={`/chat/${c.id}`}
                  onClick={() => setLast(c.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm min-w-0"
                >
                  <IconMessage2 size={14} aria-hidden="true" className="opacity-60 shrink-0" />
                  <span className="truncate">{c.titulo}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${c.titulo}"?`)) eliminar.mutate(c.id);
                  }}
                  disabled={eliminar.isPending}
                  className="p-1 opacity-0 group-hover:opacity-60 hover:opacity-100 focus:opacity-100"
                  aria-label={`Eliminar ${c.titulo}`}
                  title="Eliminar"
                >
                  <IconTrash size={12} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
