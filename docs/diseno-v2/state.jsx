// Global app state — mock capabilities + view router + module flags.
// All cross-cutting state for the prototype lives here.

const { createContext, useContext, useState, useMemo, useCallback } = React;

// ── Ámbitos autorizados — vienen del JWT del usuario (vacíos al iniciar).
// Las conversaciones nuevas del chat se auto-registran aquí, clasificadas
// por ámbito (detectado desde el texto) y por semana (calculada desde la
// fecha del sistema operativo).
const INITIAL_AMBITOS = [
  { id: 'mortalidad',    nombre: 'Mortalidad',       tematicas: [] },
  { id: 'calidad_agua',  nombre: 'Calidad de agua',  tematicas: [] },
  { id: 'productividad', nombre: 'Productividad',    tematicas: [] },
];

// Detecta ámbito de una consulta a partir de palabras clave.
// En producción este mapeo viene de domain.yaml (ámbitos + vocabulario).
function detectAmbito(text) {
  const t = (text || '').toLowerCase();
  if (/(mortalidad|peces muertos|brote|patolog|virus|bacteri|enferm)/.test(t)) return 'mortalidad';
  if (/(o2|ox[ií]geno|temperatura|salinidad|agua|fitoplancton|bloom|secchi|corriente)/.test(t)) return 'calidad_agua';
  if (/(fcr|biomasa|peso|cosecha|crecimiento|alimentaci[oó]n|engorda|productividad)/.test(t)) return 'productividad';
  return 'mortalidad'; // fallback al primero
}

// Calcula etiqueta de semana relativa a hoy: "Esta semana" / "Semana pasada" / "Hace N semanas".
function semanaRelativa(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  const dia = 24 * 60 * 60 * 1000;
  const diff = Math.floor((hoy - d) / dia);
  // Mismo lunes-domingo
  const diasDesdeLunesHoy = (hoy.getDay() + 6) % 7;
  const diasDesdeLunesFecha = (d.getDay() + 6) % 7;
  const lunesHoy = new Date(hoy);     lunesHoy.setDate(hoy.getDate()    - diasDesdeLunesHoy);
  const lunesFecha = new Date(d);     lunesFecha.setDate(d.getDate()    - diasDesdeLunesFecha);
  const semanasAtras = Math.round((lunesHoy - lunesFecha) / (7 * dia));
  if (semanasAtras <= 0) return 'Esta semana';
  if (semanasAtras === 1) return 'Semana pasada';
  return `Hace ${semanasAtras} semanas`;
}

// Formatea fecha a "dd MMM" (es-CL).
function formatFechaCorta(fecha) {
  return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }).replace('.', '');
}

// Genera un título breve para la temática a partir del primer mensaje del usuario.
function tituloConversacion(text) {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (t.length <= 56) return t;
  return t.slice(0, 56).trim() + '…';
}

// ── KPIs del usuario (configurables por asistente + rol + gerencia) ─────────
// severity: 'ok' (sobre cota), 'warn' (cerca de cota), 'bad' (bajo cota)
const MOCK_KPIS_USUARIO = [
  {
    id: 'mort',    label: 'Mortalidad diaria', value: '27 u/d',   delta: '+38%',  severity: 'bad',
    chart: 'line', subtitle: 'CTR-007 · 14 días',
    series: [11,12,10,9,13,12,14,17,21,26,24,19,22,27],
    target: { lo: 8, hi: 14, label: 'zona objetivo' },
    stats: [['acumulado 14d','237 u'],['promedio','17 u/d'],['umbral diario','14 u/d']],
  },
  {
    id: 'o2',      label: 'O₂ disuelto',       value: '6.2 mg/L', delta: '−18%',  severity: 'warn',
    chart: 'line', subtitle: 'CTR-007 jaula 4 · 7d',
    series: [7.4, 7.2, 7.0, 6.8, 6.6, 6.3, 6.2],
    target: { lo: 6.5, hi: 8.5, label: 'rango óptimo' },
    stats: [['mínimo 72h','6.0 mg/L'],['umbral','6.5 mg/L'],['tendencia','descendente']],
  },
  {
    id: 'biomasa', label: 'Biomasa total',     value: '2.450 t',  delta: '+6.5%', severity: 'ok',
    chart: 'bar',  subtitle: 'meta Q2 · 2.300 t',
    bars: [
      ['CTR-001', 820, 800],
      ['CTR-003', 610, 600],
      ['CTR-007', 412, 600],
      ['CTR-012', 608, 600],
    ],
    stats: [['cumplimiento','106%'],['mejor centro','CTR-001'],['rezagado','CTR-007']],
  },
  {
    id: 'fcr',     label: 'FCR consolidado',   value: '1.34',     delta: '−0.03', severity: 'ok',
    chart: 'gauge', subtitle: 'meta ≤ 1.35',
    gaugeValue: 1.34, gaugeMin: 1.0, gaugeMax: 1.7, gaugeTarget: 1.35,
    stats: [['semana 18','1.37'],['semana 17','1.39'],['mejor centro','CTR-001 1.31']],
  },
  {
    id: 'peso',    label: 'Peso medio',        value: '4.21 kg',  delta: '+50 g', severity: 'warn',
    chart: 'progress', subtitle: 'objetivo · 4.5 kg',
    progress: { value: 4.21, target: 4.5 },
    stats: [['ganancia sem','+50 g'],['vs ciclo ant','+6%'],['días a cosecha','~28']],
  },
];

// ── Mock /capabilities — what the runtime config endpoint would deliver ─────
const MOCK_CAPS = {
  version: '1.4.0',
  hash: 'abc123',
  tenant: {
    id: 'salmones_antartica',
    nombre: 'Salmones Antártica',
    dominio: 'salmones-antartica.cl',
    region: 'Región X · Los Lagos',
    expira: '2027-01-01T00:00:00Z',
  },
  usuario: {
    id_pseudo: 'u_a1b2c3d4',
    nombre: 'Matías Vergara',
    iniciales: 'MV',
    rol: 'Jefe de Centro',
    rol_id: 'jefe_centro',
    gerencia: 'Operaciones',
    permisos: ['consultar', 'ver_kpis', 'enviar_correo', 'aprobar_acciones_bajo', 'disparar_agente_aireadores', 'disparar_agente_muestreo'],
    email_institucional: 'matias.vergara@empresa.cl',
    idioma: 'es', // preferencia del usuario (cascada: server > Accept-Language > IDIOMA_DEFAULT > 'es')
    filtros_jwt: [
      { campo: 'gerencia',    valor: 'Operaciones',                aplica_a: 'todos los chunks' },
      { campo: 'region',      valor: 'Región X',                   aplica_a: 'datos geográficos' },
      { campo: 'centros',     valor: 'CTR-001, CTR-003, CTR-007',  aplica_a: 'series por centro' },
      { campo: 'pii_visible', valor: 'no',                         aplica_a: 'datos de personas' },
    ],
    bloqueados: [
      { tipo: 'kpi',  nombre: 'Costos operacionales',         razon: 'requiere rol Gerencia' },
      { tipo: 'kpi',  nombre: 'Márgenes por SKU',             razon: 'requiere rol Comercial' },
      { tipo: 'acc',  nombre: 'Notificación a clientes',      razon: 'requiere permiso enviar_externo' },
    ],
  },
  ui: {
    titulo:    'Asistentes Virtuales',
    subtitulo: 'Sistema integrado de gestión productiva',
    logo_letras: 'SA',
    colores: {
      navy:   '#0A2540',
      coral:  '#E85C3C',
      paper:  '#FAFAF7',
      cream:  '#F2EEDF',
    },
  },
  llm: { provider: 'anthropic', model: 'claude-opus-4-7' },
  asistente_activo: {
    id: 'engorda',
    nombre: 'Engorda',
    subtitulo: 'Centros y jaulas · ciclo productivo',
  },
};

// ── Default module catalog — Tweaks rewrites these via state ─────────────────
const DEFAULT_MODULES = {
  central:  { id: 'central',  nombre: 'Módulo central',     obligatorio: true,  estado: 'ok' },
  ml:       { id: 'ml',       nombre: 'Machine Learning',   estado: 'ok' },
  kpis:     { id: 'kpis',     nombre: 'KPIs streaming',     estado: 'ok' },
  reportes: { id: 'reportes', nombre: 'Reportes',           estado: 'ok' },
  acciones: { id: 'acciones', nombre: 'Acciones',           estado: 'ok' },
};
// Estado posibles: 'ok' | 'hidden' (no contratado) | 'locked' (showcase) | 'error'

// ── Mock conversation list ──────────────────────────────────────────────────
const MOCK_CONVOS = [
  { id: 'c1', title: 'Mortalidad CTR-007 jaula 4',     ts: '14:32', active: true,  retencion: '5 años' },
  { id: 'c2', title: 'Revisión FCR semana 19',         ts: '11:08', retencion: '5 años' },
  { id: 'c3', title: 'O₂ disuelto · CTR-003',          ts: '09:21', retencion: '5 años' },
  { id: 'c4', title: 'Plan de cosecha · sectores N/S', ts: 'ayer',  retencion: '90 d' },
  { id: 'c5', title: 'Biomasa proyectada Q3',          ts: 'lun',   retencion: '90 d' },
];

const MOCK_ENTITIES = [
  { id: 'CTR-001', label: 'Punta Cona',      count: 12 },
  { id: 'CTR-003', label: 'Quemchi Norte',   count:  4 },
  { id: 'CTR-007', label: 'Estero Reñihué',  count: 23 },
];

// ── App context ─────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function AppProvider({ children, tweaks, setTweak }) {
  // view: 'login' | 'bootstrap' | 'chat' | 'empty' | 'actions' | 'kpis' | 'reports-catalog'
  //   ⤷ canonical source is `tweaks.view` so the Tweaks panel stays in sync.
  // panel: 'none' | 'report-preview' | 'permisos' | 'audit'
  const view = tweaks?.view || 'chat';
  const setView = useCallback((v) => setTweak && setTweak('view', v), [setTweak]);

  // Initial panel can be set via URL hash (#panel=permisos) for design-canvas demos
  const initialPanel = (() => {
    if (typeof window === 'undefined' || !window.location.hash) return 'none';
    const m = window.location.hash.match(/(?:^|&)panel=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : 'none';
  })();
  const [panel, setPanel] = useState(initialPanel);

  // KPI band visibility — solo se muestra cuando el usuario lo activa desde la cabecera
  const [kpiBandOpen, setKpiBandOpen] = useState(false);
  // Última conversación (ejemplo demo) — solo aparece cuando el usuario activa el botón
  const [ultimaOpen, setUltimaOpen] = useState(false);

  // Ámbitos del sidebar — se pueblan dinámicamente cuando el usuario crea
  // conversaciones en el chat. Cada conversación se registra bajo su ámbito
  // (detectado por keywords) y su semana (calculada desde la fecha actual).
  const [ambitos, setAmbitos] = useState(INITIAL_AMBITOS);
  // Conversación actualmente cargada en el chat (id de temática del sidebar).
  const [activeConvId, setActiveConvId] = useState(null);

  // Crea o retoma una temática para una conversación.
  // - `conversationId` único por conversación (mismo durante toda la sesión).
  // - Si la temática para esa conversación ya existe, no hace nada.
  // - Si no, la crea con título derivado del primer mensaje.
  const registerConversation = useCallback((conversationId, firstUserText) => {
    setAmbitos((prev) => {
      // Si la temática ya existe, no duplicar.
      for (const amb of prev) {
        if (amb.tematicas.some((t) => t.id === conversationId)) return prev;
      }
      const ambitoId = detectAmbito(firstUserText);
      const ahora = new Date();
      const nuevaTematica = {
        id: conversationId,
        fecha: formatFechaCorta(ahora),
        semana: semanaRelativa(ahora),
        titulo: tituloConversacion(firstUserText),
        conversaciones: 1,
        createdAt: ahora.toISOString(),
      };
      return prev.map((a) => a.id === ambitoId
        ? { ...a, tematicas: [nuevaTematica, ...a.tematicas] }
        : a
      );
    });
    setActiveConvId(conversationId);
  }, []);

  // Override module statuses from tweaks
  const modules = useMemo(() => {
    const m = JSON.parse(JSON.stringify(DEFAULT_MODULES));
    if (!tweaks) return m;
    ['ml', 'kpis', 'reportes', 'acciones'].forEach((k) => {
      const s = tweaks['mod_' + k];
      if (s) m[k].estado = s;
    });
    return m;
  }, [tweaks]);

  const isEnabled = useCallback((id) => modules[id]?.estado === 'ok',     [modules]);
  const isHidden  = useCallback((id) => modules[id]?.estado === 'hidden', [modules]);
  const isLocked  = useCallback((id) => modules[id]?.estado === 'locked', [modules]);
  const isError   = useCallback((id) => modules[id]?.estado === 'error',  [modules]);
  // visible = enabled or locked (showcase). Hidden = no se muestra el slot.
  const isVisible = useCallback((id) => !isHidden(id), [isHidden]);

  const openPanel = useCallback((p) => setPanel(p), []);
  const closePanel = useCallback(() => setPanel('none'), []);

  const value = {
    caps: MOCK_CAPS,
    convos: MOCK_CONVOS,
    entities: MOCK_ENTITIES,
    ambitos,
    activeConvId, setActiveConvId,
    registerConversation,
    kpisUsuario: MOCK_KPIS_USUARIO,
    modules,
    isEnabled, isHidden, isLocked, isError, isVisible,
    view, setView,
    panel, openPanel, closePanel,
    kpiBandOpen, setKpiBandOpen,
    ultimaOpen, setUltimaOpen,
    tweaks,
    mobile: !!tweaks?.mobile,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

window.AppProvider = AppProvider;
window.useApp = useApp;
window.MOCK_CAPS = MOCK_CAPS;
