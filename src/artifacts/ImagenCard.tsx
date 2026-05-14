import type { z } from 'zod';
import type { ImagenSchema } from '@/api/types';

type Imagen = z.infer<typeof ImagenSchema>;

// Validamos el protocolo para evitar javascript: / data: arbitrarios
// (sección 14.3 del spec).
function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.href);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function ImagenCard({ artefacto }: { artefacto: Imagen }) {
  if (!isSafeUrl(artefacto.url)) {
    return (
      <div className="text-xs opacity-60 italic">Imagen omitida (protocolo no permitido).</div>
    );
  }
  return (
    <figure className="rounded-md border border-white/10 bg-white/5 p-2">
      <img
        src={artefacto.url}
        alt={artefacto.alt}
        loading="lazy"
        style={{ maxWidth: artefacto.ancho_max ? `${artefacto.ancho_max}px` : '100%' }}
        className="rounded"
      />
      {artefacto.alt ? (
        <figcaption className="text-xs opacity-60 mt-1">{artefacto.alt}</figcaption>
      ) : null}
    </figure>
  );
}
