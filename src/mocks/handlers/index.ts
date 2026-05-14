import { authHandlers } from './auth';
import { capabilitiesHandlers } from './capabilities';
import { conversacionesHandlers } from './conversaciones';
import { kpisHandlers } from './kpis';

export const handlers = [
  ...authHandlers,
  ...capabilitiesHandlers,
  ...conversacionesHandlers,
  ...kpisHandlers,
];
