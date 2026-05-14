import {
  IconInfoCircle,
  IconAlertTriangle,
  IconAlertCircle,
  IconCircleCheck,
  IconBulb,
  IconTool,
} from '@tabler/icons-react';
import type { z } from 'zod';
import type { BannerSchema } from '@/api/types';

type Banner = z.infer<typeof BannerSchema>;

const VARIANT_STYLES: Record<
  Banner['variante'],
  { bg: string; border: string; icon: typeof IconInfoCircle }
> = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: IconInfoCircle },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: IconAlertTriangle },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: IconAlertCircle },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: IconCircleCheck },
  causal: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: IconBulb },
  mantenimiento: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', icon: IconTool },
};

export default function BannerCard({ artefacto }: { artefacto: Banner }) {
  const style = VARIANT_STYLES[artefacto.variante] ?? VARIANT_STYLES.info;
  const Icon = style.icon;
  const isError = artefacto.variante === 'error';

  return (
    <div
      role={isError ? 'alert' : 'note'}
      className={`flex items-start gap-3 rounded-md border ${style.border} ${style.bg} p-3 text-sm`}
    >
      <Icon size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p>{artefacto.mensaje}</p>
        {artefacto.accion_opcional ? (
          <a
            href={artefacto.accion_opcional.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs underline opacity-90 hover:opacity-100"
          >
            {artefacto.accion_opcional.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}
