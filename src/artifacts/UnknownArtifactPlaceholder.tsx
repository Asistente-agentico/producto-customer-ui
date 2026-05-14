import { useState } from 'react';
import { IconAlertHexagon, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { UnknownArtefacto } from '@/api/types';

type Props = { artefacto: UnknownArtefacto };

export default function UnknownArtifactPlaceholder({ artefacto }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const Icon = open ? IconChevronDown : IconChevronRight;

  return (
    <div role="note" className="rounded-md border border-zinc-500/30 bg-zinc-500/10 p-3 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
      >
        <Icon size={14} aria-hidden="true" />
        <IconAlertHexagon size={16} aria-hidden="true" />
        <span className="font-medium">{t('chat.tipo_artefacto_desconocido')}</span>
        <span className="ml-auto text-xs opacity-60">({artefacto._reason})</span>
      </button>
      {open ? (
        <pre className="mt-2 overflow-auto text-xs font-mono opacity-80 max-h-48">
          {JSON.stringify(artefacto._raw, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
