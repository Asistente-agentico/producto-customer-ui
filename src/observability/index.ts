export { log } from './logger';
export { initSentry, captureError } from './sentry';
export { initOtel } from './otel';

import { initSentry } from './sentry';
import { initOtel } from './otel';

export function initObservability(): void {
  initSentry();
  initOtel();
}
