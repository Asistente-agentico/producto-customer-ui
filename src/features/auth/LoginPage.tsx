import { type FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/auth';
import { redirectToIdp } from '@/api/auth';
import { appConfig, appVersion } from '@/lib/config';
import Footer from '@/app/Footer';
import ModulosPreview from './ModulosPreview';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const loginInterno = useAuth((s) => s.loginInterno);
  const status = useAuth((s) => s.status);
  const errorMessage = useAuth((s) => s.errorMessage);

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/chat';
  const idpMode = appConfig.AUTH_MODE === 'idp_externo';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginInterno(usuario, password);
      navigate(from, { replace: true });
    } catch {
      // Mensaje viene del store en errorMessage.
    } finally {
      setSubmitting(false);
    }
  }

  if (idpMode) {
    return (
      <div className="relative min-h-screen flex flex-col bg-paper text-ink">
        <VersionBadge />
        <main className="flex-1 flex items-center justify-center p-6">
          <section className="max-w-sm w-full text-center">
            <h1 className="font-display text-2xl font-semibold mb-4">{t('auth.iniciar_sesion')}</h1>
            <p className="text-sm text-ink2 mb-6">
              Se te redirigirá al proveedor de identidad de tu organización.
            </p>
            <button
              type="button"
              onClick={() => redirectToIdp(from)}
              className="w-full bg-coral text-paper rounded-md py-2 px-4 font-medium hover:opacity-90 focus-visible:outline focus-visible:outline-2"
            >
              {t('auth.iniciar_sesion')}
            </button>
            <ModulosPreview />
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  const busy = submitting || status === 'verifying';

  return (
    <div className="relative min-h-screen flex flex-col bg-paper text-ink">
      <VersionBadge />
      <main className="flex-1 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-sm w-full bg-cream/40 border border-rule rounded-xl p-6 shadow-sm"
          aria-labelledby="login-title"
        >
          <h1 id="login-title" className="font-display text-2xl font-semibold mb-4">
            {t('auth.iniciar_sesion')}
          </h1>

          <label className="block mb-3">
            <span className="text-sm text-ink2">{t('auth.usuario')}</span>
            <input
              type="text"
              autoComplete="username"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              disabled={busy}
              className="mt-1 block w-full rounded-md border border-rule bg-paper px-3 py-2 text-base focus-visible:outline-2"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-ink2">{t('auth.password')}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="mt-1 block w-full rounded-md border border-rule bg-paper px-3 py-2 text-base focus-visible:outline-2"
            />
          </label>

          {errorMessage ? (
            <p role="alert" className="text-sm text-coral mb-3">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-coral text-paper rounded-md py-2 px-4 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t('comun.cargando') : t('auth.iniciar_sesion')}
          </button>

          <ModulosPreview />
        </form>
      </main>
      <Footer />
    </div>
  );
}

function VersionBadge() {
  return (
    <div className="absolute top-3 right-3 text-[10px] font-mono text-ink3 tracking-wider uppercase">
      v{appVersion}
    </div>
  );
}
