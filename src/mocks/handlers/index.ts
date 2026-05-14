import { authHandlers } from './auth';
import { capabilitiesHandlers } from './capabilities';

export const handlers = [...authHandlers, ...capabilitiesHandlers];
