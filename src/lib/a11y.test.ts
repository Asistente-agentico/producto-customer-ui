import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsWcagAA, pickAccessibleTextColor } from './a11y';

describe('a11y helpers', () => {
  it('contrastRatio black/white es 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('contrastRatio mismo color es 1:1', () => {
    expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 1);
  });

  it('meetsWcagAA acepta combos con ratio >= 4.5', () => {
    expect(meetsWcagAA('#002c48', '#ffffff')).toBe(true);
    expect(meetsWcagAA('#eaeaea', '#000000')).toBe(true);
  });

  it('meetsWcagAA rechaza combos con ratio < 4.5', () => {
    expect(meetsWcagAA('#999999', '#777777')).toBe(false);
  });

  it('pickAccessibleTextColor elige blanco sobre fondo oscuro', () => {
    expect(pickAccessibleTextColor('#002c48')).toBe('#ffffff');
  });

  it('pickAccessibleTextColor elige negro sobre fondo claro', () => {
    expect(pickAccessibleTextColor('#eaeaea')).toBe('#000000');
  });

  it('contrastRatio devuelve 0 si el hex es inválido', () => {
    expect(contrastRatio('not-hex', '#ffffff')).toBe(0);
  });
});
