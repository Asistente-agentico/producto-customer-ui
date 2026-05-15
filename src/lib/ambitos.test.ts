import { describe, expect, it } from 'vitest';
import { detectAmbito, tituloConversacion } from './ambitos';

const AUTORIZADOS = ['mortalidad', 'calidad_agua', 'productividad'];

describe('detectAmbito', () => {
  it('detecta mortalidad por keywords (mortalidad, brote, virus)', () => {
    expect(detectAmbito('Mortalidad última semana CTR-007', AUTORIZADOS)).toBe('mortalidad');
    expect(detectAmbito('Hubo un brote en jaula 4', AUTORIZADOS)).toBe('mortalidad');
    expect(detectAmbito('Sospecha de virus IPN', AUTORIZADOS)).toBe('mortalidad');
  });

  it('detecta calidad_agua por keywords (O₂, temperatura, salinidad)', () => {
    expect(detectAmbito('O2 disuelto bajo umbral', AUTORIZADOS)).toBe('calidad_agua');
    expect(detectAmbito('Temperatura del agua subió', AUTORIZADOS)).toBe('calidad_agua');
    expect(detectAmbito('Bloom de fitoplancton', AUTORIZADOS)).toBe('calidad_agua');
  });

  it('detecta productividad por keywords (FCR, biomasa, cosecha)', () => {
    expect(detectAmbito('Revisión FCR semana 18', AUTORIZADOS)).toBe('productividad');
    expect(detectAmbito('Biomasa proyectada Q3', AUTORIZADOS)).toBe('productividad');
    expect(detectAmbito('Plan de cosecha', AUTORIZADOS)).toBe('productividad');
  });

  it('texto sin matches → fallback al primer ámbito autorizado', () => {
    expect(detectAmbito('Hola, ¿cómo estás?', AUTORIZADOS)).toBe('mortalidad');
  });

  it('sin ámbitos autorizados → null (no se inventa)', () => {
    expect(detectAmbito('Mortalidad', [])).toBe(null);
  });

  it('solo cae a un ámbito autorizado · respeta filtro RBAC', () => {
    // Si "mortalidad" no está autorizado, no se devuelve aunque matchee.
    expect(detectAmbito('Mortalidad', ['calidad_agua', 'productividad'])).toBe('calidad_agua');
  });
});

describe('tituloConversacion', () => {
  it('texto corto se devuelve tal cual (trim + espacios normalizados)', () => {
    expect(tituloConversacion('  Hola  mundo   ')).toBe('Hola mundo');
  });

  it('trunca con elipsis si supera maxLen', () => {
    const largo = 'a'.repeat(80);
    expect(tituloConversacion(largo, 30).length).toBeLessThanOrEqual(31); // 30 + …
    expect(tituloConversacion(largo, 30).endsWith('…')).toBe(true);
  });

  it('respeta maxLen exacto sin truncar', () => {
    const exacto = 'a'.repeat(56);
    expect(tituloConversacion(exacto)).toBe(exacto);
  });
});
