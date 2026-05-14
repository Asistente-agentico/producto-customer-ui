import { useForm, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { FormularioSchema, FormularioCampoSchema } from '@/api/types';

type Formulario = z.infer<typeof FormularioSchema>;
type Campo = z.infer<typeof FormularioCampoSchema>;

/** Construye un Zod schema dinámico a partir de la lista de campos. */
function buildSchema(campos: Campo[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const c of campos) {
    let s: z.ZodTypeAny;
    switch (c.tipo) {
      case 'number':
        s = z.coerce.number();
        break;
      case 'date':
        s = z.string();
        break;
      case 'checkbox':
        s = z.boolean();
        break;
      case 'multiselect':
        s = z.array(z.string());
        break;
      default:
        s = z.string();
    }
    if (!c.requerido && c.tipo !== 'checkbox') {
      s = s.optional();
    } else if (c.tipo === 'text' || c.tipo === 'textarea' || c.tipo === 'select') {
      s = (s as z.ZodString).min(1, 'Requerido');
    }
    shape[c.nombre] = s;
  }
  return z.object(shape);
}

type Props = {
  artefacto: Formulario;
  onSubmit?: (values: FieldValues) => void | Promise<void>;
};

export default function FormularioCard({ artefacto, onSubmit }: Props) {
  const { t } = useTranslation();
  const schema = buildSchema(artefacto.campos);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-3">
      {artefacto.titulo ? <h3 className="text-sm font-semibold mb-3">{artefacto.titulo}</h3> : null}
      <form
        onSubmit={handleSubmit(async (values) => {
          if (onSubmit) await onSubmit(values);
        })}
        className="grid gap-3"
      >
        {artefacto.campos.map((c) => {
          const errorMsg = errors[c.nombre]?.message;
          const inputId = `frm-${c.nombre}`;
          return (
            <div key={c.nombre}>
              <label htmlFor={inputId} className="text-xs opacity-70">
                {c.label}
                {c.requerido ? <span aria-hidden="true"> *</span> : null}
              </label>
              {renderInput(c, inputId, register)}
              {typeof errorMsg === 'string' ? (
                <p role="alert" className="text-xs text-red-400 mt-1">
                  {errorMsg}
                </p>
              ) : null}
            </div>
          );
        })}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[var(--color-accent)] text-white py-2 px-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? t('comun.cargando') : (artefacto.submit_label ?? t('comun.aceptar'))}
        </button>
      </form>
    </article>
  );
}

function renderInput(
  c: Campo,
  id: string,
  register: ReturnType<typeof useForm>['register'],
): React.ReactElement {
  const base =
    'mt-1 block w-full rounded-md border border-white/20 bg-transparent px-2 py-1.5 text-sm focus-visible:outline-2';
  if (c.tipo === 'textarea') {
    return <textarea id={id} {...register(c.nombre)} className={`${base} min-h-[80px]`} />;
  }
  if (c.tipo === 'select') {
    return (
      <select id={id} {...register(c.nombre)} className={base}>
        <option value="">—</option>
        {(c.opciones ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (c.tipo === 'checkbox') {
    return <input id={id} type="checkbox" {...register(c.nombre)} className="mt-1" />;
  }
  const inputType = c.tipo === 'number' ? 'number' : c.tipo === 'date' ? 'date' : 'text';
  return (
    <input
      id={id}
      type={inputType}
      {...register(c.nombre)}
      className={base}
      placeholder={c.placeholder}
    />
  );
}
