import { useTranslation } from 'react-i18next';

/**
 * Cluster de módulos visible en LoginPage (handoff §2.1 / §3.2).
 *
 * En el pre-login no conocemos qué módulos están contratados por el
 * tenant (esa info viene en `/capabilities` tras login). Mostramos los
 * 5 nombres con tooltip explicando que el detalle de habilitación se
 * resuelve al iniciar sesión.
 *
 * Si en el futuro el central V2 expone un `/capabilities/preview`
 * público (sin RBAC, solo `modulos[]` y branding), este componente
 * puede consumirlo para mostrar verde/gris real desde el pre-login.
 */
const SLOTS = [
  { id: 'central', label: 'Chat' },
  { id: 'ml', label: 'ML' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'acciones', label: 'Acciones' },
  { id: 'kpis', label: 'on-line' },
];

export default function ModulosPreview() {
  const { t } = useTranslation();
  return (
    <section aria-label={t('login.modulos_titulo')} className="mt-6">
      <p className="text-[10px] uppercase tracking-wider text-ink3 mb-2">
        {t('login.modulos_titulo')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SLOTS.map((s) => (
          <span
            key={s.id}
            className="h-7 inline-flex items-center px-2.5 rounded-md text-[11px] bg-paper border border-rule text-ink2"
          >
            {s.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-ink3 mt-2">{t('login.modulos_nota')}</p>
    </section>
  );
}
