import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { actualizarPreferencias, fetchPreferencias } from '@/api/usuario';
import { changeLang, SUPPORTED_LANGS, type SupportedLang } from '@/i18n';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';
import { appVersion } from '@/lib/config';

const PREFS_KEY = ['usuario', 'preferencias'] as const;

export default function ConfiguracionPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const caps = useCapabilities((s) => s.capabilities);
  const refreshCaps = useCapabilities((s) => s.refresh);

  const prefs = useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => fetchPreferencias(),
  });

  const update = useMutation({
    mutationFn: actualizarPreferencias,
    onSuccess: (data) => {
      queryClient.setQueryData(PREFS_KEY, data);
    },
  });

  async function handleIdioma(lang: SupportedLang) {
    await changeLang(lang);
    await update.mutateAsync({ idioma: lang });
    // Re-fetch capabilities con el nuevo idioma para que el central
    // pueda devolver strings traducidos (seccion 10.6).
    await refreshCaps(lang);
  }

  const currentLang = (prefs.data?.idioma ?? i18n.language ?? 'es') as SupportedLang;

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

      <h3 className="text-sm font-semibold opacity-70 mt-6 mb-2">Idioma</h3>
      <fieldset className="flex gap-2 flex-wrap">
        <legend className="sr-only">Idioma preferido</legend>
        {SUPPORTED_LANGS.map((lang) => (
          <label
            key={lang}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer text-sm',
              currentLang === lang
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15'
                : 'border-white/20 hover:bg-white/10',
            ].join(' ')}
          >
            <input
              type="radio"
              name="idioma"
              value={lang}
              checked={currentLang === lang}
              onChange={() => void handleIdioma(lang)}
              disabled={update.isPending}
              className="accent-[var(--color-accent)]"
            />
            {lang.toUpperCase()}
          </label>
        ))}
      </fieldset>
      {update.isPending ? <p className="text-xs opacity-60 mt-1">{t('comun.cargando')}</p> : null}

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
