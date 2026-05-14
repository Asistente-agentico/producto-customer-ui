import { useTranslation } from 'react-i18next';
import TextoMarkdown from '@/artifacts/TextoMarkdown';
import ArtefactDispatcher from '@/artifacts/ArtefactDispatcher';
import FuentesPill from './FuentesPill';
import type { ChatMessage } from './useChat';

type Props = {
  message: ChatMessage;
  conversacionId?: string;
};

export default function MessageBubble({ message, conversacionId }: Props) {
  const { t } = useTranslation();

  if (message.rol === 'user') {
    return (
      <article className="flex justify-end" role="region" aria-label={t('chat.tu')}>
        <div className="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30">
          <header className="text-[10px] uppercase opacity-50 mb-1">{t('chat.tu')}</header>
          <p className="whitespace-pre-wrap text-sm">{message.texto}</p>
        </div>
      </article>
    );
  }

  const resp = message.respuesta;

  return (
    <article className="flex justify-start" role="region" aria-label={t('chat.asistente')}>
      <div className="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 bg-white/5 border border-white/10">
        <header className="text-[10px] uppercase opacity-50 mb-1">{t('chat.asistente')}</header>
        <div className="space-y-3">
          {resp.respuesta ? (
            <TextoMarkdown text={resp.respuesta} />
          ) : (
            <p className="text-sm italic opacity-60">{t('chat.respuesta_vacia')}</p>
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
      </div>
    </article>
  );
}
