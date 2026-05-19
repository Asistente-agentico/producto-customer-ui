// Detección de ámbito client-side (Q2 · fallback hasta que el central
// V2 emita `metadata.ambito_id`).
//
// La función `detectAmbito` aplica regex sobre el texto del usuario y
// retorna el slug del primer ámbito autorizado que matchee. Si no
// matchea ninguno, cae al primer ámbito autorizado del usuario.
//
// En producción, el central debería resolver el ámbito server-side
// usando el vocabulario de `domain*.yaml` y propagarlo en cada
// respuesta. Esta función se mantiene como utility por compatibilidad
// con responses legacy que no traigan `ambito_id`.

const DEFAULT_VOCAB: Record<string, RegExp> = {
  defectos: /(defecto|defectos|falla|fallas|rechazo|rechazos|merma|mermas|reclamo|reclamos|desviacion|incidente)/i,
  calidad_proceso: /(temperatura|presi[oó]n|humedad|par[aá]metro|calidad|tolerancia|fuera de rango|umbral)/i,
  produccion: /(volumen|ratio|peso|cierre.de.lote|insumo|producci[oó]n|productividad|throughput|rendimiento)/i,
};

export type AmbitoSlug = string;

/**
 * Detecta el ámbito de un texto. La lista `autorizados` viene de
 * `capabilities.ambitos_autorizados` para no ofrecer ámbitos que el
 * usuario no tiene permitidos.
 *
 * @param texto - texto del usuario (primer mensaje de la conversación)
 * @param autorizados - lista de slugs autorizados; si vacía, retorna null
 * @returns slug del ámbito o `null` si no hay autorizados
 */
export function detectAmbito(texto: string, autorizados: readonly AmbitoSlug[]): AmbitoSlug | null {
  if (autorizados.length === 0) return null;
  const norm = (texto ?? '').toLowerCase();
  for (const slug of autorizados) {
    const re = DEFAULT_VOCAB[slug];
    if (re && re.test(norm)) return slug;
  }
  // Sin match → primer autorizado como fallback (mejor que "Sin clasificar"
  // según la decisión Q2 del equipo de diseño).
  return autorizados[0] ?? null;
}

/** Genera un título corto a partir del primer mensaje (handoff §3.3). */
export function tituloConversacion(texto: string, maxLen = 56): string {
  const t = (texto ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}
