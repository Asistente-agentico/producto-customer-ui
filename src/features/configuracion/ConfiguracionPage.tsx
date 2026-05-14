import { useTranslation } from 'react-i18next';
import { appVersion } from '@/lib/config';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';

export default function ConfiguracionPage() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const caps = useCapabilities((s) => s.capabilities);

  return (
    <section className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">{t('nav.configuracion')}</h2>

      <h3 className="text-sm font-semibold opacity-70 mt-6 mb-2">{t('nav.perfil')}</h3>
      <dl className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="opacity-60">{t('auth.usuario')}</dt>
        <dd className="font-mono">{user?.id_pseudo ?? '—'}</dd>
        <dt className="opacity-60">Rol</dt>
        <dd className="font-mono">{user?.rol ?? '—'}</dd>
        {user?.gerencia ? (
          <>
            <dt className="opacity-60">Gerencia</dt>
            <dd className="font-mono">{user.gerencia}</dd>
          </>
        ) : null}
        <dt className="opacity-60">Permisos</dt>
        <dd>
          {(user?.permisos ?? []).length === 0
            ? '—'
            : (user?.permisos ?? []).map((p) => (
                <span
                  key={p}
                  className="inline-block mr-1 mb-1 px-2 py-0.5 rounded text-xs bg-white/10"
                >
                  {p}
                </span>
              ))}
        </dd>
      </dl>

      <h3 className="text-sm font-semibold opacity-70 mt-6 mb-2">Sistema</h3>
      <dl className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="opacity-60">Customer UI</dt>
        <dd className="font-mono">v{appVersion}</dd>
        <dt className="opacity-60">Capabilities</dt>
        <dd className="font-mono">{caps?.version ?? '—'}</dd>
        <dt className="opacity-60">Tenant</dt>
        <dd>{caps?.tenant.nombre ?? caps?.tenant.id ?? '—'}</dd>
      </dl>
    </section>
  );
}
