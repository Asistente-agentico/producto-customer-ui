import { useTranslation } from 'react-i18next';

export default function ReportesPage() {
  const { t } = useTranslation();
  return (
    <section className="p-6">
      <h2 className="text-lg font-semibold">{t('nav.reportes')}</h2>
      <p className="opacity-70 text-sm mt-2">Catálogo y descargas en Fase 7.</p>
    </section>
  );
}
