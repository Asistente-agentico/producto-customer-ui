import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChat } from './useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import Sugerencias from './Sugerencias';
import { useCapabilities } from '@/stores/capabilities';

export default function ChatPage() {
  const { t } = useTranslation();
  const { conversacionId } = useParams();
  const caps = useCapabilities((s) => s.capabilities);
  const { mensajes, sendMessage, isPending, lastError } = useChat({ conversacionId });

  const liveRef = useRef<HTMLDivElement>(null);
  // Scroll al final cuando hay nuevos mensajes (preservando aria-live).
  useEffect(() => {
    liveRef.current?.scrollTo({ top: liveRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes.length, isPending]);

  return (
    <section className="h-full flex flex-col">
      <header className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold">{caps?.ui.titulo ?? t('nav.chat')}</h2>
        {caps?.ui.subtitulo ? <p className="text-sm opacity-70">{caps.ui.subtitulo}</p> : null}
      </header>

      {mensajes.length === 0 ? <Sugerencias onPick={sendMessage} /> : null}

      <div
        ref={liveRef}
        className="flex-1 overflow-auto p-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-label={t('nav.chat')}
      >
        {mensajes.map((m, i) => (
          <MessageBubble key={`${m.ts}-${i}`} message={m} conversacionId={conversacionId} />
        ))}
        {isPending ? (
          <div className="text-xs opacity-70 px-1" role="status" aria-live="polite">
            {t('chat.pensando')}
          </div>
        ) : null}
        {lastError ? (
          <div role="alert" className="text-xs text-red-400 px-1">
            {lastError}
          </div>
        ) : null}
      </div>

      <ChatInput onSend={sendMessage} disabled={isPending} />
    </section>
  );
}
