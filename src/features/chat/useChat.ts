import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { crearConversacion, enviarMensaje, obtenerConversacion } from '@/api/conversaciones';
import { type MensajeRequest, type MensajeResponse, normalizeMensajeResponse } from '@/api/types';
import { captureError } from '@/observability';
import { useConversacionesStore } from '@/stores/conversaciones';
import { conversacionesQueryKey } from '@/features/conversaciones/queries';

export type UserMessage = {
  rol: 'user';
  texto: string;
  ts: string;
};

export type AssistantMessage = {
  rol: 'assistant';
  ts: string;
  respuesta: MensajeResponse;
};

export type ChatMessage = UserMessage | AssistantMessage;

type Args = {
  conversacionId?: string;
};

const conversacionQueryKey = (id: string) => ['conversacion', id] as const;

export function useChat({ conversacionId }: Args) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setLast = useConversacionesStore((s) => s.setLast);

  // Recordar última conversación cuando se navega a una.
  useEffect(() => {
    if (conversacionId) setLast(conversacionId);
  }, [conversacionId, setLast]);

  const historial = useQuery({
    queryKey: conversacionId
      ? conversacionQueryKey(conversacionId)
      : (['conversacion', 'pending'] as const),
    queryFn: async () => {
      if (!conversacionId) return null;
      const detalle = await obtenerConversacion(conversacionId);
      const mensajes: ChatMessage[] = detalle.mensajes.map((m) =>
        m.rol === 'user'
          ? { rol: 'user', texto: m.texto, ts: m.ts }
          : {
              rol: 'assistant',
              ts: m.ts,
              respuesta: normalizeMensajeResponse(m.respuesta),
            },
      );
      return { conv: detalle, mensajes };
    },
    enabled: !!conversacionId,
  });

  const mutation = useMutation({
    mutationFn: async (input: {
      texto: string;
      asistente_id?: string;
      hints?: Record<string, string>;
    }) => {
      const id =
        conversacionId ?? (await crearConversacion({ titulo: input.texto.slice(0, 60) })).id;
      if (!conversacionId) {
        setLast(id);
        navigate(`/chat/${id}`, { replace: true });
      }
      const body: MensajeRequest = {
        texto: input.texto,
        asistente_id: input.asistente_id,
        hints: input.hints,
      };
      const response = await enviarMensaje(id, body);
      return { response, id, texto: input.texto };
    },
    onMutate: ({ texto }) => {
      // Optimistic: agregamos el mensaje del usuario al cache local.
      if (!conversacionId) return;
      const key = conversacionQueryKey(conversacionId);
      const previous = queryClient.getQueryData<{ mensajes: ChatMessage[] }>(key);
      const optimistic: ChatMessage = {
        rol: 'user',
        texto,
        ts: new Date().toISOString(),
      };
      if (previous) {
        queryClient.setQueryData(key, {
          ...previous,
          mensajes: [...previous.mensajes, optimistic],
        });
      }
      return { previous };
    },
    onSuccess: ({ response, id }) => {
      const key = conversacionQueryKey(id);
      const previous = queryClient.getQueryData<{ mensajes: ChatMessage[] }>(key);
      const assistantMsg: AssistantMessage = {
        rol: 'assistant',
        ts: new Date().toISOString(),
        respuesta: response,
      };
      if (previous) {
        queryClient.setQueryData(key, {
          ...previous,
          mensajes: [...previous.mensajes, assistantMsg],
        });
      } else {
        // Primera vez: forzamos refetch al cargar la conv recién creada.
        queryClient.invalidateQueries({ queryKey: key });
      }
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey });
    },
    onError: (err) => {
      captureError(err, { context: 'enviar_mensaje' });
    },
  });

  const mensajes = historial.data?.mensajes ?? [];

  function sendMessage(texto: string, hints?: Record<string, string>) {
    const trimmed = texto.trim();
    if (!trimmed) return;
    mutation.mutate({ texto: trimmed, hints });
  }

  return {
    conversacionId,
    mensajes,
    sendMessage,
    isPending: mutation.isPending,
    isHistorialLoading: historial.isLoading,
    lastError: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
