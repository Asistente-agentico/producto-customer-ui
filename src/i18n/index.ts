// react-i18next con backend de recursos bundleados (sección 10 del spec).
// Cascada de detección (sección 10.2):
//   1. localStorage (preferencia explícita del usuario)
//   2. navigator (Accept-Language)
//   3. appConfig.IDIOMA_DEFAULT (env Capa 2)
//   4. 'es' (Capa 1)

import i18n from 'i18next';
import LanguageDetector, { type DetectorOptions } from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';
import { appConfig } from '@/lib/config';

export const SUPPORTED_LANGS = ['es', 'en', 'pt'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = 'customer-ui:lang';

const detectorOptions: DetectorOptions = {
  order: ['localStorage', 'navigator', 'htmlTag'],
  lookupLocalStorage: LANG_STORAGE_KEY,
  caches: ['localStorage'],
};

export const resources = {
  es: { customer: es },
  en: { customer: en },
  pt: { customer: pt },
} as const;

export function isSupportedLang(value: string): value is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

await i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: isSupportedLang(appConfig.IDIOMA_DEFAULT) ? appConfig.IDIOMA_DEFAULT : 'es',
    supportedLngs: [...SUPPORTED_LANGS],
    defaultNS: 'customer',
    ns: ['customer'],
    detection: detectorOptions,
    interpolation: {
      escapeValue: false, // React ya escapa.
    },
    returnNull: false,
    react: {
      useSuspense: false,
    },
  });

export default i18n;

export function changeLang(lang: SupportedLang): Promise<unknown> {
  // i18next escribe en localStorage automáticamente por el detector.
  return i18n.changeLanguage(lang);
}
