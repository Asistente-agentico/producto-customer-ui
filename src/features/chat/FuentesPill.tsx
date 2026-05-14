import { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { MensajeMetadataSchema } from '@/api/types';

type Metadata = z.infer<typeof MensajeMetadataSchema>;

export default function FuentesPill({ metadata }: { metadata: Metadata }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const chunks = metadata.chunks_used ?? 0;
  const scopes = metadata.scopes ?? [];
  if (chunks === 0 && scopes.length === 0) return null;

  const Icon = open ? IconChevronDown : IconChevronRight;
  const summary = t('chat.fuentes_resumen', {
    count: chunks,
    scopes: scopes.length > 0 ? scopes.join(', ') : '—',
  });

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        aria-expanded={open}
      >
        <Icon size={12} aria-hidden="true" />
        <IconInfoCircle size={12} aria-hidden="true" />
        <span>{summary}</span>
      </button>
      {open ? (
        <div className="mt-2 rounded border border-white/10 bg-white/5 p-2 space-y-1">
          {metadata.ambiguous_routing ? (
            <p>
              <span className="opacity-70">Ruteo:</span> ambiguo
            </p>
          ) : null}
          {metadata.permisos_aplicados?.rol ? (
            <p>
              <span className="opacity-70">Permisos aplicados:</span> rol{' '}
              <span className="font-mono">{metadata.permisos_aplicados.rol}</span>
            </p>
          ) : null}
          {metadata.permisos_aplicados?.filtros_jwt_aplicados &&
          metadata.permisos_aplicados.filtros_jwt_aplicados.length > 0 ? (
            <details>
              <summary className="opacity-70 cursor-pointer">Filtros JWT</summary>
              <pre className="text-[10px] font-mono mt-1 overflow-auto opacity-80">
                {JSON.stringify(metadata.permisos_aplicados.filtros_jwt_aplicados, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
