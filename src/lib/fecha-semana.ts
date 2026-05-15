// Helpers de calendario para el sidebar jerárquico (PR 4 / handoff §3.3).
//
// Lunes-domingo es la semana canónica del producto. Las etiquetas
// relativas se calculan desde "hoy" (Date local del navegador, no UTC,
// para que coincida con la percepción del usuario).

const DIA_MS = 24 * 60 * 60 * 1000;

/** Devuelve el lunes (00:00 local) de la semana de la fecha dada. */
export function lunesDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  // getDay() devuelve 0 (dom) – 6 (sáb). Convertimos a 0 (lun) – 6 (dom).
  const diasDesdeLunes = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diasDesdeLunes);
  return d;
}

/** Diferencia de semanas calendario entre dos fechas (a − b). */
export function semanasEntre(a: Date, b: Date): number {
  const lunesA = lunesDeSemana(a).getTime();
  const lunesB = lunesDeSemana(b).getTime();
  return Math.round((lunesA - lunesB) / (7 * DIA_MS));
}

/**
 * Etiqueta relativa de semana (handoff §3.3):
 * - 0 semanas atrás → "Esta semana"
 * - 1 → "Semana pasada"
 * - N > 1 → "Hace N semanas"
 * - N < 0 → "Próxima semana" / "En N semanas" (defensivo)
 */
export function semanaRelativa(fecha: Date | string, hoy: Date = new Date()): string {
  const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const diff = semanasEntre(hoy, f);
  if (diff <= 0) {
    if (diff === 0) return 'Esta semana';
    if (diff === -1) return 'Próxima semana';
    return `En ${Math.abs(diff)} semanas`;
  }
  if (diff === 1) return 'Semana pasada';
  return `Hace ${diff} semanas`;
}

/**
 * Agrupa items por su semana (etiqueta relativa) preservando el orden
 * de entrada y devuelve los `max` buckets más recientes.
 *
 * El caller pasa cómo extraer la fecha de cada item para evitar
 * acoplar a un shape específico.
 */
export function groupByWeek<T>(
  items: readonly T[],
  getFecha: (item: T) => Date | string,
  max = 4,
  hoy: Date = new Date(),
): Array<{ semana: string; items: T[] }> {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const semana = semanaRelativa(getFecha(it), hoy);
    const list = buckets.get(semana);
    if (list) list.push(it);
    else buckets.set(semana, [it]);
  }
  return Array.from(buckets.entries())
    .slice(0, max)
    .map(([semana, items]) => ({ semana, items }));
}

/** Formato corto "dd MMM" para mostrar bajo el título de la temática. */
export function formatFechaCorta(fecha: Date | string): string {
  const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return f
    .toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    .replace('.', '')
    .toLowerCase();
}
