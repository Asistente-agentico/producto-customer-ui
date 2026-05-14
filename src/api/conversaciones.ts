import { api } from './client';
import {
  ConversacionDetalleSchema,
  ConversacionListResponseSchema,
  MensajeResponseRawSchema,
  normalizeMensajeResponse,
  type ConversacionDetalle,
  type ConversacionListResponse,
  type MensajeRequest,
  type MensajeResponse,
} from './types';

export async function listConversaciones(cursor?: string): Promise<ConversacionListResponse> {
  const path = cursor ? `/conversaciones?cursor=${encodeURIComponent(cursor)}` : '/conversaciones';
  const raw = await api.get<unknown>(path);
  return ConversacionListResponseSchema.parse(raw);
}

export async function crearConversacion(args: {
  titulo?: string;
  asistente_id?: string;
}): Promise<{ id: string; titulo: string }> {
  return api.post<{ id: string; titulo: string }>('/conversaciones', args);
}

export async function eliminarConversacion(id: string): Promise<void> {
  await api.delete<void>(`/conversaciones/${encodeURIComponent(id)}`);
}

export async function obtenerConversacion(id: string): Promise<ConversacionDetalle> {
  const raw = await api.get<unknown>(`/conversaciones/${encodeURIComponent(id)}`);
  return ConversacionDetalleSchema.parse(raw);
}

export async function enviarMensaje(
  conversacionId: string,
  body: MensajeRequest,
): Promise<MensajeResponse> {
  const raw = await api.post<unknown>(
    `/conversaciones/${encodeURIComponent(conversacionId)}/mensajes`,
    body,
  );
  const parsed = MensajeResponseRawSchema.parse(raw);
  return normalizeMensajeResponse(parsed);
}

export async function refrescarGraficoVentana(args: {
  conversacionId: string;
  mensajeId: string;
  ventana: string;
}): Promise<MensajeResponse> {
  const raw = await api.post<unknown>(
    `/conversaciones/${encodeURIComponent(args.conversacionId)}/mensajes/${encodeURIComponent(args.mensajeId)}/refresh-grafico`,
    { ventana: args.ventana },
  );
  const parsed = MensajeResponseRawSchema.parse(raw);
  return normalizeMensajeResponse(parsed);
}
