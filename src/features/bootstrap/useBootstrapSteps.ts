import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';
import { conversacionesQueryKey } from '@/features/conversaciones/queries';
import { listConversaciones } from '@/api/conversaciones';

export type BootstrapStepStatus = 'pending' | 'in_progress' | 'done';

export type BootstrapStep = {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  status: BootstrapStepStatus;
};

/**
 * 7 pasos secuenciales del bootstrap splash (handoff §2.2 / §18 del spec).
 *
 * Los pasos se computan desde el estado de auth + capabilities + cache
 * de conversaciones. La secuencia tiene un "paso actual" (in_progress)
 * para que el usuario vea movimiento aunque el bootstrap real sea
 * rápido. Cuando la condición real se cumple, el paso pasa a 'done'
 * y el siguiente arranca como 'in_progress'.
 *
 * Cuando todos los 7 están 'done', `allDone` es true y el caller debe
 * navegar al destino (chat o ruta guardada).
 *
 * Conversaciones (paso 6) se pre-carga acá si no está en cache,
 * para que el primer render del chat tras el splash sea instantáneo.
 */
export function useBootstrapSteps() {
  const queryClient = useQueryClient();
  const authStatus = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const capsStatus = useCapabilities((s) => s.status);
  const caps = useCapabilities((s) => s.capabilities);

  const [convosLoaded, setConvosLoaded] = useState(false);
  const [tickedFinal, setTickedFinal] = useState(false);

  // Paso 6: pre-carga conversaciones (best-effort, no bloquea si falla).
  useEffect(() => {
    if (capsStatus !== 'ready' || convosLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await listConversaciones();
        if (!cancelled) {
          queryClient.setQueryData(conversacionesQueryKey, data);
          setConvosLoaded(true);
        }
      } catch {
        // Si /conversaciones falla, no bloqueamos el bootstrap.
        if (!cancelled) setConvosLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [capsStatus, convosLoaded, queryClient]);

  // Paso 7 "Asistente listo" es un pequeño delay tras 1-6 para que el
  // splash sea perceptible (mínimo 400ms tras estar todo listo).
  const step6Done = capsStatus === 'ready' && convosLoaded;
  useEffect(() => {
    if (!step6Done || tickedFinal) return;
    const t = setTimeout(() => setTickedFinal(true), 400);
    return () => clearTimeout(t);
  }, [step6Done, tickedFinal]);

  const steps = useMemo<BootstrapStep[]>(() => {
    const flags: Array<boolean> = [
      authStatus === 'authenticated', // 1
      capsStatus === 'ready' || capsStatus === 'degraded', // 2
      caps !== null, // 3 (branding aplicado al setear caps)
      (user?.permisos?.length ?? 0) > 0 || capsStatus === 'ready', // 4
      caps !== null, // 5
      step6Done, // 6
      tickedFinal, // 7
    ];

    // Buscar el primer no-done y marcarlo como in_progress; los demás
    // posteriores quedan en pending.
    let foundCurrent = false;
    return flags.map((done, idx) => {
      const id = (idx + 1) as BootstrapStep['id'];
      if (done) return { id, status: 'done' as const };
      if (!foundCurrent) {
        foundCurrent = true;
        return { id, status: 'in_progress' as const };
      }
      return { id, status: 'pending' as const };
    });
  }, [authStatus, capsStatus, caps, user, step6Done, tickedFinal]);

  const allDone = steps.every((s) => s.status === 'done');

  return { steps, allDone };
}
