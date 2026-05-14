import { describe, expect, it } from 'vitest';
import i18n, { changeLang, SUPPORTED_LANGS, isSupportedLang } from './index';

describe('i18n', () => {
  it('soporta es/en/pt', () => {
    expect(SUPPORTED_LANGS).toEqual(['es', 'en', 'pt']);
    expect(isSupportedLang('es')).toBe(true);
    expect(isSupportedLang('fr')).toBe(false);
  });

  it('traduce string core en es', async () => {
    await changeLang('es');
    expect(i18n.t('chat.enviar')).toBe('Enviar');
  });

  it('cambia a en y traduce', async () => {
    await changeLang('en');
    expect(i18n.t('chat.enviar')).toBe('Send');
  });

  it('cambia a pt y traduce', async () => {
    await changeLang('pt');
    expect(i18n.t('chat.enviar')).toBe('Enviar');
    expect(i18n.t('errores.generico')).toMatch(/Algo deu errado/);
  });
});
