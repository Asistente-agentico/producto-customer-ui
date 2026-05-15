import { useTranslation } from 'react-i18next';
import { useCapabilities } from '@/stores/capabilities';

/**
 * Placeholder de la vista de Acciones. La implementación completa
 * (cola lateral + detalle + audit log + composer + 2 pestañas) entra
 * en PR 8. Esta página existe ahora solo para que el cluster de
 * ModulesNav tenga destino navegable.
 */
export default function AccionesPage() {
  const { t: _t } = useTranslation();
  const enabled = useCapabilities((s) => s.capabilities?.modulos.acciones?.enabled === true);

  if (!enabled) {
    return (
      <section className="p-6">
        <h2 className="font-display text-lg font-semibold">Acciones</h2>
        <p className="text-sm text-ink2 mt-2">
          El módulo de Acciones no está habilitado en este deployment.
        </p>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-3xl">
      <header className="mb-4">
        <h2 className="font-display text-lg font-semibold">Acciones</h2>
        <p className="text-sm text-ink2">Seguimiento de acciones.</p>
      </header>
      <div className="rounded-md border border-rule bg-cream/40 p-6 text-sm text-ink2">
        <p>La vista completa con cola, audit log y composer entra en PR 8.</p>
        <p className="mt-2 text-xs text-ink3">
          Por ahora solo existe esta ruta como destino del cluster de módulos en la TopBar.
        </p>
      </div>
    </section>
  );
}
