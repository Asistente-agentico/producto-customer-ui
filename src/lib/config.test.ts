import { describe, expect, it } from 'vitest';
import { appConfig } from './config';

describe('appConfig', () => {
  it('expone defaults seguros cuando window.__APP_CONFIG__ esta vacio', () => {
    expect(appConfig.BACKEND_URL_CENTRAL).toMatch(/^https?:\/\//);
    expect(['iam_interno', 'idp_externo']).toContain(appConfig.AUTH_MODE);
    expect(['es', 'en', 'pt']).toContain(appConfig.IDIOMA_DEFAULT);
  });
});
