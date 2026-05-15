import { authHandlers } from './auth';
import { capabilitiesHandlers } from './capabilities';
import { conversacionesHandlers } from './conversaciones';
import { kpisHandlers } from './kpis';
import { auditHandlers } from './audit';
import { reportesHandlers } from './reportes';
import { preferenciasHandlers } from './preferencias';
import { accionesHandlers } from './acciones';

export const handlers = [
  ...authHandlers,
  ...capabilitiesHandlers,
  ...conversacionesHandlers,
  ...kpisHandlers,
  ...auditHandlers,
  ...reportesHandlers,
  ...preferenciasHandlers,
  ...accionesHandlers,
];
