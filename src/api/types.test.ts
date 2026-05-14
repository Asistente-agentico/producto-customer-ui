import { describe, expect, it } from 'vitest';
import {
  parseArtefacto,
  normalizeMensajeResponse,
  MensajeResponseRawSchema,
  CapabilitiesSchema,
} from './types';
import { capabilitiesFixture } from '@/mocks/fixtures/capabilities';

describe('parseArtefacto', () => {
  it('reconoce serie_temporal v1', () => {
    const result = parseArtefacto({
      tipo: 'serie_temporal',
      version: 1,
      titulo: 'Mortalidad',
      puntos: [{ x: '2026-04-13', y: 12 }],
    });
    expect(result.tipo).toBe('serie_temporal');
  });

  it('reconoce banner v1 con variante causal', () => {
    const result = parseArtefacto({
      tipo: 'banner',
      version: 1,
      variante: 'causal',
      mensaje: 'Aumento de mortalidad asociado a evento X.',
    });
    expect(result.tipo).toBe('banner');
  });

  it('devuelve UnknownArtefacto si tipo es desconocido', () => {
    const result = parseArtefacto({ tipo: 'futuro_v2', version: 1, foo: 'bar' });
    expect(result.tipo).toBe('desconocido');
    if (result.tipo === 'desconocido') {
      expect(result._reason).toBe('tipo_no_reconocido');
    }
  });

  it('devuelve UnknownArtefacto si la shape es invalida en tipo conocido', () => {
    const result = parseArtefacto({ tipo: 'banner', version: 1 /* falta variante y mensaje */ });
    expect(result.tipo).toBe('desconocido');
    if (result.tipo === 'desconocido') {
      expect(result._reason).toBe('parse_error');
    }
  });

  it('tolera valores no-objeto sin crashear', () => {
    expect(parseArtefacto(null).tipo).toBe('desconocido');
    expect(parseArtefacto('cualquier cosa').tipo).toBe('desconocido');
  });
});

describe('CapabilitiesSchema', () => {
  it('parsea el fixture sin errores', () => {
    const result = CapabilitiesSchema.safeParse(capabilitiesFixture);
    expect(result.success).toBe(true);
  });

  it('tolera campos desconocidos al nivel raíz', () => {
    const withExtra = { ...capabilitiesFixture, _futuro_campo: 'algo' };
    const result = CapabilitiesSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });
});

describe('normalizeMensajeResponse', () => {
  it('parsea artefactos y deja conocidos como tales, desconocidos como placeholder', () => {
    const raw = MensajeResponseRawSchema.parse({
      mensaje_id: 'm1',
      respuesta: 'hola',
      artefactos: [
        { tipo: 'banner', version: 1, variante: 'info', mensaje: 'ok' },
        { tipo: 'futuro_artefacto', version: 1, payload: 'xyz' },
      ],
    });
    const normalized = normalizeMensajeResponse(raw);
    expect(normalized.artefactos).toHaveLength(2);
    expect(normalized.artefactos[0]?.tipo).toBe('banner');
    expect(normalized.artefactos[1]?.tipo).toBe('desconocido');
  });
});
