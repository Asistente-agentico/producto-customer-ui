import { authHandlers } from './auth';
import { capabilitiesHandlers } from './capabilities';
import { conversacionesHandlers } from './conversaciones';

export const handlers = [...authHandlers, ...capabilitiesHandlers, ...conversacionesHandlers];
