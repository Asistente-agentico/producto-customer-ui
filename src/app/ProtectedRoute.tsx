import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';
import Footer from './Footer';

type Props = {
  children: ReactNode;
};

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

  if (status === 'unknown' || status === 'verifying') {
    // Bootstrap splash (PR 9 va a reemplazarlo por 7 checkmarks
    // secuenciales). Por ahora un splash mínimo con Footer.
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

  return <>{children}</>;
}
