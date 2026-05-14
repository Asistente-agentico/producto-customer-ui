import { useState } from 'react';
import type { z } from 'zod';
import type { SeleccionSchema } from '@/api/types';

type Seleccion = z.infer<typeof SeleccionSchema>;

type Props = {
  artefacto: Seleccion;
  onSelect?: (value: string | string[]) => void;
};

export default function SeleccionCard({ artefacto, onSelect }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function handlePick(value: string) {
    if (artefacto.multi) {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      setSelected(next);
      onSelect?.(next);
      return;
    }
    setSelected([value]);
    onSelect?.(value);
  }

  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-3">
      <p className="text-sm mb-3">{artefacto.pregunta}</p>
      <ul
        className="flex flex-wrap gap-2"
        role={artefacto.multi ? 'group' : 'radiogroup'}
        aria-label={artefacto.pregunta}
      >
        {artefacto.opciones.map((opt) => {
          const isSel = selected.includes(opt.value);
          return (
            <li key={opt.value}>
              <button
                type="button"
                role={artefacto.multi ? 'checkbox' : 'radio'}
                aria-checked={isSel}
                onClick={() => handlePick(opt.value)}
                className={[
                  'px-3 py-1.5 rounded-md border text-sm',
                  isSel
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15'
                    : 'border-white/20 hover:bg-white/10',
                ].join(' ')}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
