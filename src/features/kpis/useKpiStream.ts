import { useEffect, useRef, useState } from 'react';
import { subscribeKpiStream } from '@/api/kpis-sse';
import { useKpis } from '@/stores/kpis';
import { useCapabilities } from '@/stores/capabilities';

type Args = {
  metricas?: string[];
  entidades?: string[];
};

export function useKpiStream({ metricas, entidades }: Args = {}) {
  const caps = useCapabilities((s) => s.capabilities);
  const setConnected = useKpis((s) => s.setConnected);
  const apply = useKpis((s) => s.apply);
  const flushAnnouncement = useKpis((s) => s.flushAnnouncement);
  const [announce, setAnnounce] = useState<string | null>(null);
  const lastRef = useRef<{ close: () => void } | null>(null);

  const enabled = caps?.modulos.kpis?.enabled === true;
  const baseUrl = caps?.modulos.kpis?.base_url;

  useEffect(() => {
    if (!enabled || !baseUrl) return;
    const sub = subscribeKpiStream(
      { baseUrl, metricas, entidades },
      {
        onOpen: () => setConnected(true),
        onKpiUpdate: (ev) => apply(ev),
        onError: () => setConnected(false),
      },
    );
    lastRef.current = sub;
    return () => sub.close();
  }, [enabled, baseUrl, metricas, entidades, apply, setConnected]);

  // Throttle de aria-live: cada 5s comprobamos si hay que anunciar.
  useEffect(() => {
    const timer = setInterval(() => {
      const msg = flushAnnouncement();
      if (msg) setAnnounce(msg);
    }, 5000);
    return () => clearInterval(timer);
  }, [flushAnnouncement]);

  return { announce };
}
