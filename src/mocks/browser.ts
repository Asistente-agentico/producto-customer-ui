// Solo se importa cuando useMocks es true (ver src/main.tsx).
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
