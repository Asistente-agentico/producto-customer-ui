import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crearConversacion, enviarMensaje } from '@/api/conversaciones';
import type { MensajeRequest, MensajeResponse } from '@/api/types';
import { useNavigate } from 'react-router-dom';
import { captureError } from '@/observability';

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

export function useChat({ conversacionId }: Args) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | undefined>(conversacionId);
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (conversacionId && conversacionId !== activeId) {
      setActiveId(conversacionId);
      setMensajes([]);
    }
  }, [conversacionId, activeId]);

  const mutation = useMutation({
    mutationFn: async (input: {
      texto: string;
      asistente_id?: string;
      hints?: Record<string, string>;
    }) => {
      const id = activeId ?? (await crearConversacion({ titulo: input.texto.slice(0, 60) })).id;
      if (!activeId) {
        setActiveId(id);
        navigate(`/chat/${id}`, { replace: true });
      }
      const body: MensajeRequest = {
        texto: input.texto,
        asistente_id: input.asistente_id,
        hints: input.hints,
      };
      const response = await enviarMensaje(id, body);
      return { response, id };
    },
    onSuccess: ({ response }) => {
      setMensajes((prev) => [
        ...prev,
        { rol: 'assistant', ts: new Date().toISOString(), respuesta: response },
      ]);
    },
    onError: (err) => {
      captureError(err, { context: 'enviar_mensaje' });
    },
  });

  function sendMessage(texto: string, hints?: Record<string, string>) {
    const trimmed = texto.trim();
    if (!trimmed) return;
    setMensajes((prev) => [...prev, { rol: 'user', texto: trimmed, ts: new Date().toISOString() }]);
    mutation.mutate({ texto: trimmed, hints });
  }

  return {
    conversacionId: activeId,
    mensajes,
    sendMessage,
    isPending: mutation.isPending,
    lastError: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
