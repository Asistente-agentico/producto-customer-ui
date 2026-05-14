import { useTranslation } from 'react-i18next';
import { useCapabilities } from '@/stores/capabilities';

export default function ChatPage() {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);

  return (
    <section className="h-full flex flex-col">
      <header className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold">{t('nav.chat')}</h2>
        {caps?.ui.subtitulo ? <p className="text-sm opacity-70">{caps.ui.subtitulo}</p> : null}
      </header>
      <div className="flex-1 grid place-items-center text-sm opacity-70 px-6 text-center">
        <div>
          <p>Chat se conectará al módulo central en Fase 3.</p>
          <p className="mt-2">Placeholder activo · {t('chat.input_placeholder')}</p>
        </div>
      </div>
    </section>
  );
}
