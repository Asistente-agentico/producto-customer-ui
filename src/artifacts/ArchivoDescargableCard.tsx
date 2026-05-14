import { IconDownload, IconFile } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { ArchivoDescargableSchema } from '@/api/types';

type Archivo = z.infer<typeof ArchivoDescargableSchema>;

function isSafeMime(mime: string): boolean {
  // Lista mínima: documentos, hojas, presentaciones, pdf, csv, txt.
  if (!mime.includes('/')) return false;
  if (mime.startsWith('text/html')) return false;
  return true;
}

function bytesToHuman(n: number | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export default function ArchivoDescargableCard({ artefacto }: { artefacto: Archivo }) {
  const { t } = useTranslation();

  function handleDownload() {
    if (!isSafeMime(artefacto.mime_type)) return;
    if (artefacto.modo === 'url_firmada' && artefacto.url) {
      window.open(artefacto.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (artefacto.modo === 'base64_inline' && artefacto.base64_contenido) {
      const blob = base64ToBlob(artefacto.base64_contenido, artefacto.mime_type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artefacto.nombre_archivo;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-3 flex items-center gap-3">
      <IconFile size={20} className="opacity-70 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{artefacto.nombre_archivo}</p>
        <p className="text-[10px] opacity-60">
          {artefacto.mime_type}
          {artefacto.tamano_bytes ? ` · ${bytesToHuman(artefacto.tamano_bytes)}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="text-xs px-3 py-1.5 rounded bg-[var(--color-accent)] text-white font-medium hover:opacity-90 flex items-center gap-1"
      >
        <IconDownload size={14} aria-hidden="true" />
        {t('comun.descargar')}
      </button>
    </article>
  );
}
