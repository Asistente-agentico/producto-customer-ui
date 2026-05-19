import { describe, expect, it } from 'vitest';
import { detectAmbito, tituloConversacion } from './ambitos';

const AUTORIZADOS = ['defectos', 'calidad_proceso', 'produccion'];

describe('detectAmbito', () => {
  it('detecta defectos por keywords (defecto, falla, rechazo)', () => {
    expect(detectAmbito('Defectos última semana LIN-007', AUTORIZADOS)).toBe('defectos');
    expect(detectAmbito('Hubo una falla en máquina 4', AUTORIZADOS)).toBe('defectos');
    expect(detectAmbito('Rechazos por desviación en QA', AUTORIZADOS)).toBe('defectos');
  });

  it('detecta calidad_proceso por keywords (temperatura, presión, parámetro)', () => {
    expect(detectAmbito('Temperatura fuera de rango', AUTORIZADOS)).toBe('calidad_proceso');
    expect(detectAmbito('Presión subió bajo umbral', AUTORIZADOS)).toBe('calidad_proceso');
    expect(detectAmbito('Parámetro crítico desviado', AUTORIZADOS)).toBe('calidad_proceso');
  });

  it('detecta produccion por keywords (volumen, ratio, throughput)', () => {
    expect(detectAmbito('Revisión ratio semana 18', AUTORIZADOS)).toBe('produccion');
    expect(detectAmbito('Volumen proyectado Q3', AUTORIZADOS)).toBe('produccion');
    expect(detectAmbito('Plan de cierre de lote', AUTORIZADOS)).toBe('produccion');
  });

  it('texto sin matches → fallback al primer ámbito autorizado', () => {
    expect(detectAmbito('Hola, ¿cómo estás?', AUTORIZADOS)).toBe('defectos');
  });

  it('sin ámbitos autorizados → null (no se inventa)', () => {
    expect(detectAmbito('Defectos', [])).toBe(null);
  });

  it('solo cae a un ámbito autorizado · respeta filtro RBAC', () => {
    // Si "defectos" no está autorizado, no se devuelve aunque matchee.
    expect(detectAmbito('Defectos', ['calidad_proceso', 'produccion'])).toBe('calidad_proceso');
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
