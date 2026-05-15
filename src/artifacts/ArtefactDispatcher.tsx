// Dispatcher único de artefactos (sección 6.5 del spec).
// Cada componente se carga lazy para mantener bundle inicial chico.

import { lazy, Suspense } from 'react';
import type { Artefacto } from '@/api/types';
import UnknownArtifactPlaceholder from './UnknownArtifactPlaceholder';

const SerieTemporalCard = lazy(() => import('./SerieTemporalCard'));
const TablaCard = lazy(() => import('./TablaCard'));
const TableroKpiCard = lazy(() => import('./TableroKpiCard'));
const ImagenCard = lazy(() => import('./ImagenCard'));
const BannerCard = lazy(() => import('./BannerCard'));
const ProgresoCard = lazy(() => import('./ProgresoCard'));
const AccionPropuestaCard = lazy(() => import('./AccionPropuestaCard'));
// Q11 · `ArchivoDescargableCard` eliminado del dispatcher por política
// firme (Reportes es el único canal de salida de datos). El componente
// fue borrado del repo. Si llega un artefacto `archivo_descargable`,
// cae a `UnknownArtifactPlaceholder` (vía `parseArtefacto`).
const FormularioCard = lazy(() => import('./FormularioCard'));
const SeleccionCard = lazy(() => import('./SeleccionCard'));

type Props = {
  artefacto: Artefacto;
  /** Contexto opcional para artefactos que disparan acciones (refresh-grafico, follow-up, etc.). */
  conversacionId?: string;
  mensajeId?: string;
};

function Loader() {
  return <div className="h-12 bg-white/5 rounded animate-pulse" aria-hidden="true" />;
}

export default function ArtefactDispatcher({ artefacto, conversacionId, mensajeId }: Props) {
  return (
    <Suspense fallback={<Loader />}>
      {renderArtifact(artefacto, { conversacionId, mensajeId })}
    </Suspense>
  );
}

function renderArtifact(
  artefacto: Artefacto,
  ctx: { conversacionId?: string; mensajeId?: string },
) {
  switch (artefacto.tipo) {
    case 'serie_temporal':
      return (
        <SerieTemporalCard
          artefacto={artefacto}
          conversacionId={ctx.conversacionId}
          mensajeId={ctx.mensajeId}
        />
      );
    case 'tabla':
      return <TablaCard artefacto={artefacto} />;
    case 'tablero_kpi':
      return <TableroKpiCard artefacto={artefacto} />;
    case 'imagen':
      return <ImagenCard artefacto={artefacto} />;
    case 'banner':
      return <BannerCard artefacto={artefacto} />;
    case 'progreso':
      return <ProgresoCard artefacto={artefacto} />;
    case 'accion_propuesta':
      return (
        <AccionPropuestaCard
          artefacto={artefacto}
          conversacionId={ctx.conversacionId ?? 'unknown'}
        />
      );
    case 'formulario':
      return <FormularioCard artefacto={artefacto} />;
    case 'seleccion':
      return <SeleccionCard artefacto={artefacto} />;
    case 'desconocido':
      return <UnknownArtifactPlaceholder artefacto={artefacto} />;
    default: {
      // Exhaustividad: si Artefacto se extiende sin actualizar el switch,
      // TS marca error en compile time.
      const _exhaustive: never = artefacto;
      return (
        <UnknownArtifactPlaceholder
          artefacto={{ tipo: 'desconocido', _raw: _exhaustive, _reason: 'tipo_no_reconocido' }}
        />
      );
    }
  }
}
