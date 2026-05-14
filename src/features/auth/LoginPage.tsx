import { type FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/auth';
import { redirectToIdp } from '@/api/auth';
import { appConfig } from '@/lib/config';

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
      <main className="min-h-screen flex items-center justify-center p-6">
        <section className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-semibold mb-4">{t('auth.iniciar_sesion')}</h1>
          <p className="text-sm opacity-70 mb-6">
            Se te redirigirá al proveedor de identidad de tu organización.
          </p>
          <button
            type="button"
            onClick={() => redirectToIdp(from)}
            className="w-full bg-[var(--color-accent)] text-white rounded-md py-2 px-4 font-medium hover:opacity-90 focus-visible:outline focus-visible:outline-2"
          >
            {t('auth.iniciar_sesion')}
          </button>
        </section>
      </main>
    );
  }

  const busy = submitting || status === 'verifying';

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-lg"
        aria-labelledby="login-title"
      >
        <h1 id="login-title" className="text-2xl font-semibold mb-4">
          {t('auth.iniciar_sesion')}
        </h1>

        <label className="block mb-3">
          <span className="text-sm">{t('auth.usuario')}</span>
          <input
            type="text"
            autoComplete="username"
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            disabled={busy}
            className="mt-1 block w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:outline-2"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm">{t('auth.password')}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className="mt-1 block w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-base focus-visible:outline-2"
          />
        </label>

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-400 mb-3">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[var(--color-accent)] text-white rounded-md py-2 px-4 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t('comun.cargando') : t('auth.iniciar_sesion')}
        </button>
      </form>
    </main>
  );
}
