import { useTranslation } from 'react-i18next';
import { useCapabilities } from '@/stores/capabilities';

type Props = {
  onPick: (texto: string) => void;
};

/**
 * Sugerencias precargadas filtradas por los ámbitos disponibles para el
 * usuario (sección 7.3 del spec).
 */
export default function Sugerencias({ onPick }: Props) {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);

  const sugerenciasPorAmbito = caps?.ui.consultas_sugeridas ?? {};
  const permisos = new Set(caps?.usuario.permisos ?? []);
  // Permisos básicos para chat (siempre presentes en el ejemplo, pero
  // RBAC final lo decide el backend — esto es solo pre-check léxico).
  const ambitosUsuario = (caps?.ui.asistentes ?? [])
    .filter((a) => !a.disabled)
    .flatMap((a) => a.ambitos);

  const sugerencias: string[] = [];
  for (const ambito of ambitosUsuario) {
    const lista = sugerenciasPorAmbito[ambito];
    if (!lista) continue;
    for (const s of lista) {
      if (!sugerencias.includes(s)) sugerencias.push(s);
    }
  }

  if (sugerencias.length === 0) return null;
  // Pre-check léxico: si requiere permiso especial (ej. enviar correo),
  // ocultar si no lo tiene.
  const visibles = sugerencias.filter((s) => {
    const lc = s.toLowerCase();
    if (lc.includes('correo') || lc.includes('email')) {
      return permisos.has('enviar_correo');
    }
    return true;
  });

  if (visibles.length === 0) return null;

  return (
    <section aria-label={t('chat.sugerencias')} className="p-3 border-b border-white/10">
      <h3 className="text-xs uppercase opacity-50 mb-2">{t('chat.sugerencias')}</h3>
      <ul className="flex flex-wrap gap-2">
        {visibles.slice(0, 6).map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
