import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { initObservability, log } from './observability';
import { useMocks } from './lib/config';

initObservability();

if (useMocks) {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  log.info('lifecycle', 'msw_started');
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
