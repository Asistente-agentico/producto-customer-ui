import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLanguage, IconChevronDown } from '@tabler/icons-react';
import { changeLang, SUPPORTED_LANGS, type SupportedLang } from '@/i18n';

export default function LangSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLang = (SUPPORTED_LANGS as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLang)
    : 'es';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.configuracion')}
        className={[
          'h-8 inline-flex items-center gap-1 px-2.5 rounded-md text-[11px] uppercase tracking-wide transition-colors',
          open
            ? 'bg-navy text-cream border border-navy'
            : 'bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
        ].join(' ')}
      >
        <IconLanguage size={14} aria-hidden="true" />
        {activeLang}
        <IconChevronDown size={10} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-32 rounded-md border border-rule bg-paper shadow-lg z-20"
        >
          {SUPPORTED_LANGS.map((lang) => (
            <li key={lang}>
              <button
                type="button"
                role="option"
                aria-selected={lang === activeLang}
                onClick={() => {
                  void changeLang(lang);
                  setOpen(false);
                }}
                className={[
                  'block w-full text-left px-3 py-2 text-sm hover:bg-cream/50',
                  lang === activeLang ? 'font-semibold text-navy' : 'text-ink2',
                ].join(' ')}
              >
                {lang.toUpperCase()}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
