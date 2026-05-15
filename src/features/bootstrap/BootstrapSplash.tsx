import { IconCheck, IconLoader2, IconCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import Footer from '@/app/Footer';
import type { BootstrapStep } from './useBootstrapSteps';

type Props = {
  steps: BootstrapStep[];
};

/**
 * Bootstrap splash (handoff §2.2). 7 checkmarks secuenciales con
 * estados: done (✓ verde), in_progress (spinner coral), pending (●
 * gris). Aparece entre login OK y chat mientras se cargan caps,
 * preferencias, conversaciones.
 */
export default function BootstrapSplash({ steps }: Props) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <main className="flex-1 flex items-center justify-center px-6">
        <section
          aria-busy={steps.some((s) => s.status !== 'done')}
          aria-live="polite"
          className="w-full max-w-md"
        >
          <header className="mb-6 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {t('bootstrap.preparando')}
            </h1>
            <p className="text-sm text-ink2 mt-1">{t('app.subtitulo')}</p>
          </header>
          <ol className="rounded-lg border border-rule bg-cream/40 divide-y divide-rule/60">
            {steps.map((s) => (
              <StepRow key={s.id} step={s} label={t(`bootstrap.paso_${s.id}`)} />
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function StepRow({ step, label }: { step: BootstrapStep; label: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span aria-hidden="true" className="shrink-0">
        {step.status === 'done' ? (
          <IconCheck size={16} className="text-ok" />
        ) : step.status === 'in_progress' ? (
          <IconLoader2 size={16} className="text-coral animate-spin" />
        ) : (
          <IconCircle size={16} className="text-ink3/50" />
        )}
      </span>
      <span
        className={[
          'text-[13px] tracking-tight',
          step.status === 'done'
            ? 'text-ink'
            : step.status === 'in_progress'
              ? 'text-ink font-medium'
              : 'text-ink3',
        ].join(' ')}
      >
        {label}
      </span>
    </li>
  );
}
