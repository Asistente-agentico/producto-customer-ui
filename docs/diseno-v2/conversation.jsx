// Conversation — stateful chat: detect intent, call Claude, render with artifacts.

const { useState: useStateC, useCallback: useCallbackC, useContext: useContextC, createContext: createContextC } = React;

// Initial seeded thread — preserves the demo conversation from the start.
// Marked with `demo: true` so the UI can label it clearly.
const INITIAL_MESSAGES = [
  {
    id: 'u-1', role: 'user', time: '14:31', demo: true,
    text: 'Revisa la mortalidad de CTR-007 jaula 4 en los últimos 14 días, dime qué la está causando, proyecta los próximos 7 días y prepara una notificación al jefe de centro si corresponde.',
  },
  {
    id: 'a-1', role: 'assistant', time: '14:32', runId: 'a7c1', demo: true,
    intro: [
      { kind: 'p', text: 'Mortalidad en {CTR-007} jaula 4 viene escalando desde el 08 may. Hoy registramos **27 unidades**, un %coral{+38%} sobre el promedio de la semana anterior y fuera de la zona objetivo (8–14/día).' },
    ],
    artifacts: ['line_chart', 'causal_alert', 'prediction', 'report_stub', 'action_stub'],
    midText: {
      causal_alert_pre: 'Buscando correlatos en las series ambientales del centro, encuentro una señal causal clara con la oxigenación:',
      prediction_pre:   'Proyección a 7 días con el modelo {mort-ar-v3} (entrenado con histórico del centro + variables ambientales):',
      report_stub_pre:  'Generé el archivo de evidencia y dejé propuesta una notificación al jefe de centro. Ambos requieren tu validación:',
    },
    outro: '¿Quieres que también genere un seguimiento para el equipo veterinario o deje esto pendiente hasta tener respuesta de Hugo?',
  },
];

// ── Intent detection ────────────────────────────────────────────────────────
function detectIntent(text) {
  const t = (text || '').toLowerCase();
  const a = [];
  const hasChartTerm = /(mortalidad|peces|tasa.*diaria|biomasa|fcr|o2|ox[ií]geno|temperatura|peso|cosecha)/.test(t);
  const hasTimeWindow = /(d[ií]as|semana|mes|ventana|hist[oó]ric|14d|7d)/.test(t);
  const hasCausal = /(por qu[eé]|causa|raz[oó]n|correl|análisis|porque)/.test(t);
  const hasPred   = /(predic|proyec|pron[oó]stico|forecast|pr[oó]xim|estima|adelante|futuro)/.test(t);
  const hasReport = /(reporte|excel|pdf|descar|powerpoint|power bi|informe|generar.*archivo|generame|generar)/.test(t);
  const hasAction = /(notific|env[ií]a|correo|email|whatsapp|aviso|llama|disparar|ejecutar.*acci[oó]n|avisar|comunicar)/.test(t);

  if (hasChartTerm && (hasTimeWindow || !hasPred)) a.push('line_chart');
  if (hasCausal) a.push('causal_alert');
  if (hasPred) a.push('prediction');
  if (hasReport) a.push('report_stub');
  if (hasAction) a.push('action_stub');
  return a;
}

// ── Claude call ─────────────────────────────────────────────────────────────
async function generateAssistantText({ userText, role, gerencia, asistente, artifacts, modules }) {
  const artifactDesc = artifacts.length
    ? artifacts.map((a) => ({
        line_chart:   'un gráfico de serie temporal con la métrica solicitada',
        causal_alert: 'un banner con análisis causal de las variables que correlacionan',
        prediction:   'un gráfico de predicción a 7 días con intervalo de confianza',
        report_stub:  'un archivo descargable (Excel/PDF/PowerPoint)',
        action_stub:  'una propuesta de acción que el usuario debe aprobar',
      }[a])).join(', ')
    : 'una respuesta de solo texto';

  const moduleNote = [];
  if (artifacts.includes('prediction') && !modules.ml)       moduleNote.push('IMPORTANTE: el módulo ML no está activo, no incluyas el gráfico de predicción y menciona que requiere licencia ML.');
  if (artifacts.includes('report_stub') && !modules.reportes) moduleNote.push('IMPORTANTE: el módulo Reportes no está activo, menciona que la descarga requiere licencia.');
  if (artifacts.includes('action_stub') && !modules.acciones) moduleNote.push('IMPORTANTE: el módulo Acciones no está activo, menciona que el envío requiere licencia.');

  const system = `Eres un asistente B2B de Salmones Antártica para gestión productiva en acuicultura del salmón. Respondes en español de Chile, tono técnico-profesional, conciso, sin emojis, sin saludos genéricos.

CONTEXTO DEL USUARIO:
- Rol: ${role}
- Gerencia: ${gerencia}
- Asistente activo: ${asistente}
- Acceso: 3 centros de cultivo (CTR-001 Punta Cona, CTR-003 Quemchi Norte, CTR-007 Estero Reñihué), región X · Los Lagos.
- PII filtrada · permisos por JWT.

ARTEFACTOS QUE SE VAN A RENDERIZAR DESPUÉS DE TU TEXTO: ${artifactDesc}.
${moduleNote.join(' ')}

INSTRUCCIONES DE FORMATO:
Devuelve SOLAMENTE un JSON válido (sin markdown, sin \\\`\\\`\\\`, sin prefijo) con esta forma:
{ "intro": "1-2 oraciones explicando qué vas a mostrar y la conclusión principal", "outro": "1 oración con la siguiente pregunta o paso sugerido (o null si no aplica)" }

Datos de dominio que puedes referenciar para que la respuesta suene real (NO los inventes):
- CTR-007 jaula 4: mortalidad 27 unidades hoy, +38% vs semana anterior, O₂ 6.2 mg/L (bajo umbral 6.5), temperatura 14.7 °C.
- CTR-003: O₂ 6.5 mg/L, biomasa 610 t, FCR 1.36.
- CTR-001 Punta Cona: biomasa 820 t, FCR 1.31, sin alertas.
- Si no hay datos exactos para lo que pidió, di "los datos sugieren..." de forma breve y honesta.`;

  try {
    const raw = await window.claude.complete({
      messages: [
        { role: 'user', content: `${system}\n\nPREGUNTA DEL USUARIO:\n"${userText}"` },
      ],
    });
    // strip code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const json = JSON.parse(cleaned);
    return { intro: json.intro || '', outro: json.outro || null };
  } catch (err) {
    console.warn('[claude] fallback:', err);
    return {
      intro: `Procesando tu consulta sobre ${asistente.toLowerCase()}. ${artifacts.length ? 'Te muestro los datos a continuación:' : 'No tengo datos para esa pregunta específica.'}`,
      outro: artifacts.length ? '¿Quieres profundizar en alguno de estos puntos?' : null,
    };
  }
}

// ── Context ─────────────────────────────────────────────────────────────────
const ConvCtx = createContextC(null);
const useConversation = () => useContextC(ConvCtx);

function ConversationProvider({ children }) {
  const { caps, modules, registerConversation, activeConvId, setActiveConvId } = useApp();
  // El chat parte vacío. La conversación de ejemplo solo se muestra si el
  // usuario activa el botón "Última" de la cabecera (estado en AppContext).
  const [messages, setMessages] = useStateC([]);
  const [streaming, setStreaming] = useStateC(false);

  const sendMessage = useCallbackC(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || streaming) return;

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    // Si es el primer mensaje de la sesión, registra la conversación
    // en el sidebar bajo su ámbito + semana.
    let convId = activeConvId;
    if (!convId) {
      convId = 'conv-' + Date.now();
      setActiveConvId(convId);
      registerConversation(convId, trimmed);
    }

    // 1) push user message
    const userId = 'u-' + Date.now();
    setMessages((prev) => [...prev, { id: userId, role: 'user', time, text: trimmed }]);

    // 2) detect intent + start streaming
    const artifacts = detectIntent(trimmed);
    setStreaming(true);

    // 3) tiny delay so the typing indicator is visible even if Claude is fast
    await new Promise((r) => setTimeout(r, 350));

    // 4) call Claude
    const mods = {
      ml:       modules.ml.estado       === 'ok',
      kpis:     modules.kpis.estado     === 'ok',
      reportes: modules.reportes.estado === 'ok',
      acciones: modules.acciones.estado === 'ok',
    };
    // filter artifacts by module availability for what we'll actually render
    const renderable = artifacts.filter((a) => {
      if (a === 'prediction'   && !mods.ml)       return false;
      if (a === 'report_stub'  && !mods.reportes && !modules.reportes.estado === 'locked') return mods.reportes || modules.reportes.estado === 'locked';
      if (a === 'action_stub'  && !mods.acciones && !modules.acciones.estado === 'locked') return mods.acciones || modules.acciones.estado === 'locked';
      return true;
    });

    const { intro, outro } = await generateAssistantText({
      userText: trimmed,
      role: caps.usuario.rol,
      gerencia: caps.usuario.gerencia,
      asistente: caps.asistente_activo.nombre,
      artifacts: renderable,
      modules: mods,
    });

    const aId = 'a-' + Date.now();
    setMessages((prev) => [...prev, {
      id: aId, role: 'assistant', time,
      runId: aId.slice(-4),
      intro: [{ kind: 'p', text: intro }],
      artifacts: renderable,
      midText: {},
      outro,
    }]);
    setStreaming(false);
  }, [caps, modules, streaming, activeConvId, setActiveConvId, registerConversation]);

  // Resetea el chat para empezar una conversación nueva.
  const reset = useCallbackC(() => {
    setMessages([]);
    setActiveConvId(null);
  }, [setActiveConvId]);

  return (
    <ConvCtx.Provider value={{ messages, sendMessage, streaming, reset, demoMessages: INITIAL_MESSAGES }}>
      {children}
    </ConvCtx.Provider>
  );
}

window.ConversationProvider = ConversationProvider;
window.useConversation = useConversation;
