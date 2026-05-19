import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { useCapabilities } from '@/stores/capabilities';
import { useTranslation } from 'react-i18next';
import Footer from './Footer';
import BootstrapSplash from '@/features/bootstrap/BootstrapSplash';
import { useBootstrapSteps } from '@/features/bootstrap/useBootstrapSteps';
import { auditEvent } from '@/api/audit';

type Props = {
  children: ReactNode;
  // PR 3 · gating opcional por permiso. Si se omite, el componente
  // solo valida auth + bootstrap. Si se incluye y el usuario no tiene
  // el/los permisos requeridos (AND semantics para arrays), redirige
  // a `denyRedirectTo` (default '/') y dispara `permission_denied`
  // al audit log.
  requirePerm?: string | string[];
  denyRedirectTo?: string;
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
export default function ProtectedRoute({ children, requirePerm, denyRedirectTo }: Props) {
  const { t, i18n } = useTranslation();
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const location = useLocation();

  const capsStatus = useCapabilities((s) => s.status);
  const loadCaps = useCapabilities((s) => s.load);
  const caps = useCapabilities((s) => s.capabilities);

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

  // PR 3 · gating por permiso. Se evalúa después de auth + bootstrap
  // para garantizar que `caps` esté cargado. AND semantics si es array.
  if (requirePerm) {
    const userPerms = caps?.usuario.permisos ?? [];
    const required = Array.isArray(requirePerm) ? requirePerm : [requirePerm];
    const denegados = required.filter((p) => !userPerms.includes(p));
    if (denegados.length > 0) {
      void auditEvent({
        evento: 'permission_denied',
        recurso: location.pathname,
        metadata: { required, denegados },
      });
      // TODO: cuando exista sistema de toasts en el repo, mostrar
      // notificación "Necesitás el permiso X para acceder a esta vista".
      return <Navigate to={denyRedirectTo ?? '/'} replace />;
    }
  }

  return <>{children}</>;
}
