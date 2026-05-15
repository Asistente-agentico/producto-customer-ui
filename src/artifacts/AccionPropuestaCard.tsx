import { useNavigate } from 'react-router-dom';
import { IconMail, IconRobot, IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { AccionPropuestaSchema } from '@/api/types';

type Accion = z.infer<typeof AccionPropuestaSchema>;

type Props = {
  artefacto: Accion;
  conversacionId: string;
};

/**
 * AccionPropuestaCard v2 (Q4 + Q5 + Q11).
 *
 * El artefacto en el chat es un **stub** que solo navega al módulo
 * Acciones. La revisión, edición y ejecución (incluido envío de
 * correos, que es responsabilidad exclusiva del módulo Acciones)
 * viven en `/acciones/:id_propuesta`.
 *
 * Sin `riesgo`, sin niveles de fricción, sin parámetros editables
 * inline, sin confirmación local — toda esa lógica está en la vista.
 */
export default function AccionPropuestaCard({ artefacto }: Props) {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();

  const isCorreo = artefacto.tipo_accion === 'ENVIAR_CORREO';
  const Icon = isCorreo ? IconMail : IconRobot;

  const titulo =
    artefacto.titulo ??
    (isCorreo
      ? String(artefacto.parametros['asunto'] ?? 'Correo institucional')
      : 'Disparar agente');
  const sub =
    artefacto.sub ??
    (isCorreo
      ? `Para: ${String(artefacto.parametros['destinatario'] ?? '—')}`
      : artefacto.permiso_requerido
        ? `Requiere permiso: ${artefacto.permiso_requerido}`
        : 'Acción manual');

  return (
    <article
      className="rounded-md border border-rule bg-cream/40 p-3 flex items-center gap-3"
      role="region"
      aria-label="Acción propuesta"
    >
      <Icon size={20} className="shrink-0 text-ink2" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-ink3">{artefacto.tipo_accion}</p>
        <p className="text-sm font-medium text-ink truncate">{titulo}</p>
        <p className="text-[11px] text-ink2 truncate">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/acciones/${encodeURIComponent(artefacto.id_propuesta)}`)}
        className="shrink-0 h-8 px-3 rounded-md bg-coral text-paper text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1"
      >
        Revisar en panel
        <IconArrowRight size={12} aria-hidden="true" />
      </button>
    </article>
  );
}
