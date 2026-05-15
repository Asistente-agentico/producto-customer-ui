import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconSend } from '@tabler/icons-react';
import { useCapabilities } from '@/stores/capabilities';

type Props = {
  onSend: (texto: string) => void;
  disabled?: boolean;
};

export default function ChatInput({ onSend, disabled }: Props) {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);
  const [texto, setTexto] = useState('');

  const placeholder = caps?.ui.placeholders?.consulta ?? t('chat.input_placeholder');

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = texto.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setTexto('');
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-rule p-3 flex gap-2 items-end bg-paper">
      {/* Sin scope chips · "asistente engorda · CTR-007" se eliminó del
          composer en el handoff v2.0 §3.10. Si en el futuro hace falta
          contexto explícito, se reintroduce vía artefacto `seleccion`. */}
      <label className="sr-only" htmlFor="chat-input">
        {placeholder}
      </label>
      <textarea
        id="chat-input"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="text"
        className="flex-1 min-h-[44px] max-h-40 resize-none rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink3 focus-visible:outline-2 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!texto.trim() || disabled}
        aria-label={t('chat.enviar')}
        className="h-11 px-4 rounded-md bg-coral text-paper text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
      >
        <IconSend size={16} aria-hidden="true" />
        <span className="hidden sm:inline">{t('chat.enviar')}</span>
      </button>
    </form>
  );
}
