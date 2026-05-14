import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { onApiEvent } from '@/api/client';

export default function VersionBanner() {
  const { t } = useTranslation();
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    const off = onApiEvent((ev) => {
      if (ev.kind === 'new_version_available') {
        setLatest(ev.latest);
      }
    });
    return () => {
      off();
    };
  }, []);

  if (!latest) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-40 bg-[var(--color-accent)] text-white rounded-md shadow-lg p-3 flex items-center gap-3"
    >
      <span className="text-sm flex-1">{t('version.nueva_disponible')}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-sm underline font-medium hover:opacity-90"
      >
        {t('version.refrescar')}
      </button>
    </div>
  );
}
