/* eslint-disable react-refresh/only-export-components --
   `router` debe coexistir con componentes en este archivo. Fast Refresh
   no aplica al config del router; los componentes aquí no son
   re-utilizables. */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from './AppLayout';
import { useTranslation } from 'react-i18next';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ChatPage = lazy(() => import('@/features/chat/ChatPage'));
const DashboardPage = lazy(() => import('@/features/kpis/DashboardPage'));
const ReportesPage = lazy(() => import('@/features/reportes/ReportesPage'));
const ConfiguracionPage = lazy(() => import('@/features/configuracion/ConfiguracionPage'));
const AccionesPage = lazy(() => import('@/features/acciones/AccionesPage'));

function PageLoader() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center h-full opacity-70 text-sm py-12"
    >
      {t('comun.cargando')}
    </div>
  );
}

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedShell />,
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:conversacionId', element: <ChatPage /> },
      // /on-line es el nombre v2 del módulo KPIs streaming (Q3).
      // /dashboard se mantiene como alias hasta PR 5.
      { path: 'on-line', element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'reportes', element: <ReportesPage /> },
      { path: 'acciones', element: <AccionesPage /> },
      { path: 'configuracion', element: <ConfiguracionPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/chat" replace /> },
]);
