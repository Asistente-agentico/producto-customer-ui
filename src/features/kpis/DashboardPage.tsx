import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <section className="p-6">
      <h2 className="text-lg font-semibold">{t('nav.dashboard')}</h2>
      <p className="opacity-70 text-sm mt-2">KPIs en vivo se conectarán en Fase 5 (SSE).</p>
    </section>
  );
}
