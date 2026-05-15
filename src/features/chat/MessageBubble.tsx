import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import TextoMarkdown from '@/artifacts/TextoMarkdown';
import ArtefactDispatcher from '@/artifacts/ArtefactDispatcher';
import FuentesPill from './FuentesPill';
import type { ChatMessage } from './useChat';

type Props = {
  message: ChatMessage;
  conversacionId?: string;
};

/**
 * MessageBubble v2 (PR 6 · handoff §3.8). Cada mensaje (usuario o
 * asistente) tiene botón individual de colapsar/expandir. Cuando se
 * colapsa: preview de 2 líneas + contador de artefactos ocultos.
 *
 * Paleta v2:
 * - User: bg-coral/10 + border-coral/30
 * - Assistant: bg-cream/40 + border-rule (sutil, sobre el paper)
 */
export default function MessageBubble({ message, conversacionId }: Props) {
  const { t } = useTranslation();
  const [colapsado, setColapsado] = useState(false);

  if (message.rol === 'user') {
    return (
      <article className="flex justify-end" role="region" aria-label={t('chat.tu')}>
        <div className="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 bg-coral/10 border border-coral/30">
          <BubbleHeader
            label={t('chat.tu')}
            colapsado={colapsado}
            onToggle={() => setColapsado((v) => !v)}
          />
          {colapsado ? (
            <p className="text-[12.5px] text-ink2 line-clamp-2">{message.texto}</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-ink">{message.texto}</p>
          )}
        </div>
      </article>
    );
  }

  const resp = message.respuesta;
  const artefactosCount = resp.artefactos.length;

  return (
    <article className="flex justify-start" role="region" aria-label={t('chat.asistente')}>
      <div className="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 bg-cream/40 border border-rule">
        <BubbleHeader
          label={t('chat.asistente')}
          colapsado={colapsado}
          onToggle={() => setColapsado((v) => !v)}
        />
        {colapsado ? (
          <div>
            {resp.respuesta ? (
              <p className="text-[12.5px] text-ink2 line-clamp-2">{resp.respuesta}</p>
            ) : (
              <p className="text-[12.5px] italic text-ink3">{t('chat.respuesta_vacia')}</p>
            )}
            {artefactosCount > 0 ? (
              <p className="mt-1.5 text-[11px] text-ink3 font-mono">
                +{artefactosCount}{' '}
                {artefactosCount === 1 ? 'artefacto oculto' : 'artefactos ocultos'}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {resp.respuesta ? (
              <TextoMarkdown text={resp.respuesta} />
            ) : (
              <p className="text-sm italic text-ink3">{t('chat.respuesta_vacia')}</p>
            )}
            {resp.artefactos.map((a, idx) => (
              <ArtefactDispatcher
                key={idx}
                artefacto={a}
                conversacionId={conversacionId}
                mensajeId={resp.mensaje_id}
              />
            ))}
            {resp.metadata ? <FuentesPill metadata={resp.metadata} /> : null}
          </div>
        )}
      </div>
    </article>
  );
}

function BubbleHeader({
  label,
  colapsado,
  onToggle,
}: {
  label: string;
  colapsado: boolean;
  onToggle: () => void;
}) {
  const Icon = colapsado ? IconChevronRight : IconChevronDown;
  return (
    <header className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] uppercase tracking-wider text-ink3">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!colapsado}
        aria-label={colapsado ? 'Expandir mensaje' : 'Colapsar mensaje'}
        className="grid place-items-center min-w-[28px] min-h-[24px] rounded text-ink3 hover:text-ink hover:bg-paper/60"
      >
        <Icon size={14} aria-hidden="true" />
      </button>
    </header>
  );
}
