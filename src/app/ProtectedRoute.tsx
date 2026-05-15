import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';
import Footer from './Footer';
import BootstrapSplash from '@/features/bootstrap/BootstrapSplash';
import { useBootstrapSteps } from '@/features/bootstrap/useBootstrapSteps';

type Props = {
  children: ReactNode;
};

/**
 * Guarda de rutas autenticadas (handoff §2.2 + §18 del spec).
 *
 * Flujo:
 * 1. `auth.status === 'unknown'` → bootstrap automático.
 * 2. `'verifying'` → splash mínimo "verificando sesión".
 * 3. `'anonymous'` → redirige a /login.
 * 4. `'authenticated'` + `caps.status !== 'ready'/'degraded'` →
 *    BootstrapSplash con 7 checkmarks.
 * 5. `caps.status === 'ready'` y todos los pasos done → children.
 * 6. `caps.status === 'degraded'` → children con banner (AppLayout lo maneja).
 */
export default function ProtectedRoute({ children }: Props) {
  const { t, i18n } = useTranslation();
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const location = useLocation();

  const capsStatus = useCapabilities((s) => s.status);
  const loadCaps = useCapabilities((s) => s.load);

  useEffect(() => {
    if (status === 'unknown') {
      void bootstrap();
    }
  }, [status, bootstrap]);

  useEffect(() => {
    if (status === 'authenticated' && capsStatus === 'idle') {
      void loadCaps(i18n.language);
    }
  }, [status, capsStatus, loadCaps, i18n.language]);

  const { steps, allDone } = useBootstrapSteps();

  if (status === 'unknown' || status === 'verifying') {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-ink">
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink2" role="status" aria-live="polite">
            {t('auth.verificando')}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // status === 'authenticated' — mostrar splash hasta que el bootstrap
  // termine los 7 pasos. Si capabilities cae a `degraded` sin cache,
  // dejamos pasar igual para que AppLayout muestre su banner.
  if (!allDone && capsStatus !== 'degraded') {
    return <BootstrapSplash steps={steps} />;
  }

  return <>{children}</>;
}
