// Cliente HTTP del módulo Acciones (handoff §3.7 + Q5 + Q11).
//
// Endpoints (Q11 · sin /solicitar-aprobacion ni /aprobar):
// - POST /acciones · crear borrador (desde "+ Nueva" o stub del chat)
// - GET /acciones · cola del usuario
// - GET /acciones/{id} · detalle + audit log
// - PATCH /acciones/{id} · editar parámetros (solo si pendiente)
// - POST /acciones/{id}/ejecutar · disparar (audit log obligatorio)
// - POST /acciones/{id}/descartar
//
// Q11.3 · backend rechaza adjuntos en ENVIAR_CORREO con VALIDATION_ERROR.
// Q11.7 · backend valida `from === email_institucional` del JWT.

import { api } from './client';
import {
  AccionSchema,
  AccionesListResponseSchema,
  AgenteCatalogoSchema,
  type Accion,
  type AccionesListResponse,
  type AgenteCatalogo,
  type TipoAccion,
} from './types';
import { useCapabilities } from '@/stores/capabilities';
import { z } from 'zod';

function getAccionesBaseUrl(): string {
  const caps = useCapabilities.getState().capabilities;
  return caps?.modulos.acciones?.base_url ?? '';
}

export async function listAcciones(): Promise<AccionesListResponse> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.get<unknown>('/acciones', baseUrl ? { baseUrl } : undefined);
  return AccionesListResponseSchema.parse(raw);
}

export async function obtenerAccion(id: string): Promise<Accion> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.get<unknown>(
    `/acciones/${encodeURIComponent(id)}`,
    baseUrl ? { baseUrl } : undefined,
  );
  return AccionSchema.parse(raw);
}

export type CrearAccionInput = {
  tipo: TipoAccion;
  titulo: string;
  sub?: string;
  parametros: Record<string, unknown>;
  permiso_requerido?: string;
  origen?: string;
};

export async function crearAccion(input: CrearAccionInput): Promise<Accion> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.post<unknown>('/acciones', input, baseUrl ? { baseUrl } : undefined);
  return AccionSchema.parse(raw);
}

export async function actualizarAccion(
  id: string,
  patch: { parametros?: Record<string, unknown>; titulo?: string; sub?: string },
): Promise<Accion> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.put<unknown>(
    `/acciones/${encodeURIComponent(id)}`,
    patch,
    baseUrl ? { baseUrl } : undefined,
  );
  return AccionSchema.parse(raw);
}

export async function ejecutarAccion(id: string): Promise<Accion> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.post<unknown>(
    `/acciones/${encodeURIComponent(id)}/ejecutar`,
    {},
    baseUrl ? { baseUrl } : undefined,
  );
  return AccionSchema.parse(raw);
}

export async function descartarAccion(id: string): Promise<Accion> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.post<unknown>(
    `/acciones/${encodeURIComponent(id)}/descartar`,
    {},
    baseUrl ? { baseUrl } : undefined,
  );
  return AccionSchema.parse(raw);
}

export async function fetchCatalogoAgentes(): Promise<AgenteCatalogo[]> {
  const baseUrl = getAccionesBaseUrl();
  const raw = await api.get<unknown>(
    '/acciones/catalogo-agentes',
    baseUrl ? { baseUrl } : undefined,
  );
  return z.array(AgenteCatalogoSchema).parse(raw);
}
