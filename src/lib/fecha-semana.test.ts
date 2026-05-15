import { describe, expect, it } from 'vitest';
import {
  formatFechaCorta,
  groupByWeek,
  lunesDeSemana,
  semanaRelativa,
  semanasEntre,
} from './fecha-semana';

// Construimos fechas con (year, monthIndex, day) para no depender de
// la timezone del runtime (los strings ISO con solo "YYYY-MM-DD" se
// interpretan como UTC y desplazan el día en zonas con offset).
function date(y: number, m: number, d: number, h = 12): Date {
  return new Date(y, m - 1, d, h, 0, 0, 0);
}

describe('lunesDeSemana', () => {
  it('miércoles devuelve el lunes anterior', () => {
    expect(lunesDeSemana(date(2026, 5, 13)).getDate()).toBe(11);
  });

  it('lunes se devuelve a sí mismo (00:00)', () => {
    const r = lunesDeSemana(date(2026, 5, 11, 18));
    expect(r.getHours()).toBe(0);
    expect(r.getDate()).toBe(11);
  });

  it('domingo devuelve el lunes anterior (no el siguiente)', () => {
    expect(lunesDeSemana(date(2026, 5, 17)).getDate()).toBe(11);
  });
});

describe('semanasEntre', () => {
  it('mismo día → 0', () => {
    const d = date(2026, 5, 15);
    expect(semanasEntre(d, d)).toBe(0);
  });

  it('lunes y domingo de la misma semana → 0', () => {
    expect(semanasEntre(date(2026, 5, 17), date(2026, 5, 11))).toBe(0);
  });

  it('semana anterior → 1', () => {
    expect(semanasEntre(date(2026, 5, 15), date(2026, 5, 8))).toBe(1);
  });
});

describe('semanaRelativa', () => {
  const hoy = date(2026, 5, 15); // viernes

  it('Esta semana', () => {
    expect(semanaRelativa(date(2026, 5, 13), hoy)).toBe('Esta semana');
  });

  it('Semana pasada', () => {
    expect(semanaRelativa(date(2026, 5, 8), hoy)).toBe('Semana pasada');
  });

  it('Hace 2 semanas', () => {
    expect(semanaRelativa(date(2026, 5, 1), hoy)).toBe('Hace 2 semanas');
  });

  it('Hace 5 semanas', () => {
    expect(semanaRelativa(date(2026, 4, 10), hoy)).toBe('Hace 5 semanas');
  });
});

describe('groupByWeek', () => {
  it('agrupa items por semana relativa y respeta el max', () => {
    const hoy = date(2026, 5, 15);
    const items = [
      { id: 'a', fecha: date(2026, 5, 14) }, // Esta semana
      { id: 'b', fecha: date(2026, 5, 13) }, // Esta semana
      { id: 'c', fecha: date(2026, 5, 7) }, // Semana pasada
      { id: 'd', fecha: date(2026, 4, 30) }, // Hace 2 semanas
      { id: 'e', fecha: date(2026, 4, 20) }, // Hace 4 semanas
      { id: 'f', fecha: date(2026, 4, 10) }, // Hace 5 semanas (queda fuera con max=4)
    ];
    const buckets = groupByWeek(items, (it) => it.fecha, 4, hoy);
    expect(buckets.length).toBeLessThanOrEqual(4);
    expect(buckets[0]?.semana).toBe('Esta semana');
    expect(buckets[0]?.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(buckets[1]?.semana).toBe('Semana pasada');
  });

  it('items en mismo bucket conservan orden de entrada', () => {
    const hoy = date(2026, 5, 15);
    const items = [
      { id: 'a', fecha: date(2026, 5, 13) },
      { id: 'b', fecha: date(2026, 5, 14) },
      { id: 'c', fecha: date(2026, 5, 12) },
    ];
    const buckets = groupByWeek(items, (it) => it.fecha, 4, hoy);
    expect(buckets[0]?.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('formatFechaCorta', () => {
  it('formato dd MMM sin punto, en minúsculas', () => {
    const r = formatFechaCorta(date(2026, 5, 13));
    // No assertamos texto exacto del mes porque depende de la locale del
    // runtime de tests; sí que no contiene punto y está en minúsculas.
    expect(r).not.toContain('.');
    expect(r).toBe(r.toLowerCase());
    expect(r).toMatch(/\d{2}/);
  });
});
