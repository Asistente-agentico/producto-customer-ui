// Helpers de accesibilidad (sección 15.3 del spec).
// - pickAccessibleTextColor: ajusta texto claro/oscuro segun luminancia
//   del fondo para mantener contraste ≥4.5:1.

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 3 && clean.length !== 6) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(bgHex: string, fgHex: string): number {
  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);
  if (!bg || !fg) return 0;
  const lBg = relativeLuminance(bg);
  const lFg = relativeLuminance(fg);
  const lighter = Math.max(lBg, lFg);
  const darker = Math.min(lBg, lFg);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Dado un color de fondo en hex, elige texto blanco o negro según el
 * que cumpla mejor contraste (≥4.5:1 para texto normal, sección 15.3).
 */
export function pickAccessibleTextColor(bgHex: string): '#ffffff' | '#000000' {
  const white = contrastRatio(bgHex, '#ffffff');
  const black = contrastRatio(bgHex, '#000000');
  return white >= black ? '#ffffff' : '#000000';
}

/**
 * Reporta si un par bg/fg cumple AA para texto normal o grande.
 */
export function meetsWcagAA(
  bgHex: string,
  fgHex: string,
  size: 'normal' | 'large' = 'normal',
): boolean {
  const min = size === 'normal' ? 4.5 : 3.0;
  return contrastRatio(bgHex, fgHex) >= min;
}
