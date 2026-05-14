import { useMemo, useState, type FormEvent } from 'react';
import { IconShieldCheck, IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { AccionPropuestaSchema } from '@/api/types';
import { api } from '@/api/client';

type Accion = z.infer<typeof AccionPropuestaSchema>;

type Props = {
  artefacto: Accion;
  conversacionId: string;
};

type State = 'pendiente' | 'enviada' | 'descartada' | 'confirmada' | 'fallida';

const RIESGO_TONE: Record<Accion['riesgo'], string> = {
  bajo: 'border-emerald-500/40 bg-emerald-500/10',
  medio: 'border-amber-500/40 bg-amber-500/10',
  alto: 'border-red-500/40 bg-red-500/10',
};

export default function AccionPropuestaCard({ artefacto, conversacionId }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>('pendiente');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [params, setParams] = useState<Record<string, unknown>>(artefacto.parametros);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editables = useMemo(() => new Set(artefacto.permite_edicion), [artefacto.permite_edicion]);

  const mutation = useMutation({
    mutationFn: async () => {
      return api.post<unknown>('/accion', {
        id_propuesta: artefacto.id_propuesta,
        conversation_id: conversacionId,
        parametros_finales: params,
        confirmado_en: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setState('enviada');
    },
    onError: (err) => {
      setState('fallida');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state !== 'pendiente') return;

    if (artefacto.riesgo === 'medio' && !confirmCheckbox) {
      setErrorMsg('Marcá la casilla de confirmación.');
      return;
    }
    if (artefacto.riesgo === 'alto') {
      const expected = String(params['destinatario'] ?? '').trim();
      if (!expected || confirmText.trim() !== expected) {
        setErrorMsg(t('acciones.doble_confirmacion', { frase: expected || '...' }));
        return;
      }
    }
    setErrorMsg(null);
    mutation.mutate();
  }

  if (state === 'descartada') {
    return <div className="text-xs opacity-60 italic">Acción descartada.</div>;
  }
  if (state === 'enviada') {
    return (
      <div
        role="status"
        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm flex items-center gap-2"
      >
        <IconCheck size={16} aria-hidden="true" />
        Acción confirmada y enviada.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-md border ${RIESGO_TONE[artefacto.riesgo]} p-3`}
    >
      <header className="flex items-center gap-2 mb-3">
        {artefacto.riesgo === 'bajo' ? (
          <IconShieldCheck size={16} aria-hidden="true" />
        ) : (
          <IconAlertTriangle size={16} aria-hidden="true" />
        )}
        <h3 className="text-sm font-semibold flex-1">{artefacto.tipo_accion}</h3>
        <span className="text-[10px] uppercase opacity-70">
          {t(`acciones.riesgo_${artefacto.riesgo}`)}
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-2 text-xs">
        {Object.entries(artefacto.parametros).map(([key, value]) => {
          const editable = editables.has(key);
          const stringValue = stringify(value);
          return (
            <div key={key}>
              <dt className="opacity-70 mb-0.5">{key}</dt>
              <dd>
                {editable ? (
                  <textarea
                    value={String(params[key] ?? '')}
                    onChange={(e) => setParams((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-transparent border border-white/20 rounded px-2 py-1 text-xs font-mono"
                    rows={stringValue.length > 80 ? 4 : 2}
                    aria-label={`${key} (editable)`}
                  />
                ) : (
                  <span className="font-mono opacity-90">{stringValue}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {artefacto.riesgo === 'medio' ? (
        <label className="flex items-center gap-2 mt-3 text-xs">
          <input
            type="checkbox"
            checked={confirmCheckbox}
            onChange={(e) => setConfirmCheckbox(e.target.checked)}
          />
          Confirmo que revisé los parámetros.
        </label>
      ) : null}

      {artefacto.riesgo === 'alto' ? (
        <label className="block mt-3 text-xs">
          {t('acciones.doble_confirmacion', { frase: String(params['destinatario'] ?? '...') })}
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 w-full bg-transparent border border-white/20 rounded px-2 py-1 text-xs font-mono"
          />
        </label>
      ) : null}

      {errorMsg ? (
        <p role="alert" className="text-xs text-red-400 mt-2">
          {errorMsg}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={() => setState('descartada')}
          className="text-xs px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
        >
          <IconX size={14} aria-hidden="true" className="inline -mt-0.5 mr-1" />
          {t('acciones.descartar')}
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="text-xs px-3 py-1.5 rounded bg-[var(--color-accent)] text-white font-medium disabled:opacity-50"
        >
          {mutation.isPending ? t('comun.cargando') : t('acciones.confirmar')}
        </button>
      </div>
    </form>
  );
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
