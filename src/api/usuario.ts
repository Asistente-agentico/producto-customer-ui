import { api } from './client';
import { PreferenciasSchema, type Preferencias } from './types';

export async function fetchPreferencias(): Promise<Preferencias> {
  const raw = await api.get<unknown>('/usuario/preferencias');
  return PreferenciasSchema.parse(raw);
}

export async function actualizarPreferencias(
  partial: Partial<Preferencias>,
): Promise<Preferencias> {
  const raw = await api.put<unknown>('/usuario/preferencias', partial);
  return PreferenciasSchema.parse(raw);
}
