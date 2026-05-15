import { IconCalendar } from '@tabler/icons-react';

/**
 * Texto plano con la fecha actual. Sin panel, sin toggle, sin
 * interacción. Se actualiza al renderizar (no live; un refresh diario
 * basta — el usuario rara vez tiene la app abierta cruzando medianoche).
 */
export default function DateBlock() {
  const d = new Date();
  const fecha = d.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const anio = d.getFullYear();
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2 text-ink2 text-[12px]"
      aria-label={`Fecha de hoy: ${fecha} ${anio}`}
    >
      <IconCalendar size={12} className="text-ink3" aria-hidden="true" />
      <span className="tracking-tight">
        {fecha} {anio}
      </span>
    </div>
  );
}
