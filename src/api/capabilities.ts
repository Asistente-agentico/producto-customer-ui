import { api } from './client';
import { CapabilitiesSchema, type Capabilities } from './types';
import { log } from '@/observability/logger';

/**
 * GET /capabilities con tolerancia a campos desconocidos.
 * El header X-Capabilities-Version se monitorea desde client.ts.
 */
export async function fetchCapabilities(lang?: string): Promise<Capabilities> {
  const path = lang ? `/capabilities?lang=${encodeURIComponent(lang)}` : '/capabilities';
  const raw = await api.get<unknown>(path);
  const parsed = CapabilitiesSchema.safeParse(raw);
  if (!parsed.success) {
    log.error('api', 'capabilities_parse_failed', {
      issues: parsed.error.issues.slice(0, 5),
    });
    throw new Error('capabilities_invalid_shape');
  }
  return parsed.data;
}
