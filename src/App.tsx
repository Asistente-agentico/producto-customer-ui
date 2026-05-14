import { appConfig, appVersion, useMocks } from './lib/config';

export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section
        className="max-w-xl w-full bg-white/5 border border-white/10 rounded-xl p-8 shadow-lg backdrop-blur"
        aria-label="Estado del bootstrap"
      >
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Asistentes Virtuales</h1>
          <p className="text-sm opacity-70">Customer UI · v{appVersion}</p>
        </header>
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="opacity-60">Backend central</dt>
          <dd className="font-mono break-all">{appConfig.BACKEND_URL_CENTRAL}</dd>
          <dt className="opacity-60">Auth mode</dt>
          <dd className="font-mono">{appConfig.AUTH_MODE}</dd>
          <dt className="opacity-60">Idioma default</dt>
          <dd className="font-mono">{appConfig.IDIOMA_DEFAULT}</dd>
          <dt className="opacity-60">Tenant</dt>
          <dd className="font-mono">{appConfig.TENANT_ID || '(sin valor)'}</dd>
          <dt className="opacity-60">Mocks (MSW)</dt>
          <dd className="font-mono">{useMocks ? 'activos' : 'inactivos'}</dd>
        </dl>
        <p className="mt-6 text-xs opacity-60">
          Bootstrap de Fase 0. Auth, capabilities y chat se conectan en fases siguientes.
        </p>
      </section>
    </main>
  );
}
