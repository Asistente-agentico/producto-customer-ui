# LLM_usuario.md — Especificación para construir la interfaz de usuario (webui)

> Documento de referencia para implementar una interfaz dinámica conectada al
> backend RAG salmonero. Cubre: contrato HTTP con el LLM (endpoint `/consulta`),
> archivos de configuración que data-drive la UI, payloads, respuestas, eventos
> auxiliares, RBAC visual y renderizado dinámico (gráficos, descargas, KPIs,
> correos simulados, informes).
>
> Fuente del repo: `C:\Users\karin\DEMO_SALMONERA`. Backend en FastAPI puerto
> 8080. Frontend único en `webui/index.html` (HTML + CSS + JS vanilla, sin
> frameworks; Chart.js v4 cargado por CDN).

---

## 1. Arquitectura del sistema

```
┌──────────────┐   GET /domain                ┌────────────────┐
│  Navegador   │ ───────────────────────────► │ FastAPI (8080) │
│ index.html   │ ◄─────────────────────────── │  main.py       │
│ (vanilla JS) │   POST /consulta             │                │
│ Chart.js CDN │   POST /serie-temporal       │  Orchestrator  │
└──────────────┘   POST /accion               │  + RAG Agent   │
                   POST /pipeline/batch        │  + Causal      │
                   GET  /riesgos               │  + Datamart    │
                   GET  /informe               │   (SQLite)     │
                   POST /informe/accion        │  + Qdrant      │
                                               └────────────────┘
```

- **Frontend**: una sola página (`webui/index.html`). Toda la interfaz se
  renderiza dinámicamente a partir de `/domain` y `/static/consultas_demo.json`.
- **Backend Python**: el LLM (Gemini 2.5 Flash Lite) vive detrás de
  `POST /consulta`. La UI **no** habla con Gemini directamente — solo con
  FastAPI.
- **Static**: FastAPI monta `webui/` como `/static`, por lo que el front
  puede pedir `/static/consultas_demo.json`, `/static/SII.png`, etc.

---

## 2. Endpoints HTTP (contrato completo con el backend)

Definidos en `main.py`. La UI debe conocer estos seis principales:

### 2.1 `GET /domain`

Devuelve toda la configuración pública del dominio. **Llamada de bootstrap** —
ejecutarla apenas carga la página y poblar el estado global del frontend.

**Response** (extracto, ver §3 para detalle completo):
```json
{
  "domain": { "name": "Asistentes Virtuales — Salmonera", "description": "...", "language": "es" },
  "ambitos": [
    { "id": "centros_cultivo", "nombre": "Centros de Cultivo", "descripcion": "..." },
    ...
  ],
  "roles": [
    { "id": "jefe_centro", "nombre": "Jefe de Centro", "ambitos": ["centros_cultivo", ...] },
    ...
  ],
  "ui": { /* passthrough de config/domain.yaml > ui */ },
  "consultas_sugeridas": { "centros_cultivo": [...], ... },
  "entidades": [
    { "nombre": "Centro de Cultivo", "identificador": "centro_id",
      "identificador_regex": "\\bCTR-\\d{3}\\b", "prefijo_display": "Centro" },
    ...
  ]
}
```

**Headers**: `Cache-Control: no-store, no-cache, must-revalidate`. La UI debe
hacer fetch fresco en cada arranque.

### 2.2 `POST /consulta`  ← **llamada principal al LLM**

Único endpoint que invoca al LLM. Devuelve la respuesta natural más todos los
artefactos auxiliares (serie temporal, archivo descargable, tablero KPI).

**Request** (`ConsultaRequest`):
```json
{
  "consulta": "string (1..2000 chars, requerido)",
  "usuario_id": "string (requerido, ej. 'user_001')",
  "rol": "string (requerido, uno de los ids de domain.roles)",
  "grafico_rule_id": "string | null (opcional, dispara serie_temporal)",
  "ventana_dias": "string | null (opcional, '7'|'30'|'90'|'ciclo')",
  "accion_rule_id": "string | null (opcional, dispara archivo descargable)",
  "kpi_rule_id": "string | null (opcional, dispara tablero KPI)"
}
```

> **Nota del frontend actual**: la UI agrega un *sufijo de brevedad* al campo
> `consulta` antes de mandarlo, para forzar respuestas concisas (1-3
> oraciones, sin bullets). Ese sufijo va SOLO al payload — la burbuja del
> usuario en pantalla muestra el texto original. Snippet usado:
>
> ```js
> const HINT_BREVEDAD = '\n\n[Instrucción de respuesta: responde EXCLUSIVAMENTE lo que se preguntó, en 1 a 3 oraciones máximo. NO agregues información extra...]';
> const payload = { consulta: textoUsuario + HINT_BREVEDAD, usuario_id, rol };
> ```

**Response** (`ConsultaResponse`):
```json
{
  "respuesta": "string (texto natural del LLM, en markdown ligero)",
  "scopes": ["centros_cultivo", "..."],            // ámbitos consultados
  "chunks_used": 7,                                // chunks vectoriales usados
  "causal_context": { /* dict | null */ },         // contexto causal si aplica
  "ambiguous_routing": false,                      // si hubo desambiguación LLM
  "error": null,                                   // string si falló validación
  "blocked": false,                                // true si guardrail bloqueó
  "entidades_efectivas": ["CTR-001", "LP-2026-0508"],
  "serie_temporal": { /* ver §5.1 */ },
  "archivo_descargable": { /* ver §5.2 */ },
  "tablero_kpi": { /* ver §5.3 */ }
}
```

Si `blocked` o `error` están seteados, mostrar la `respuesta` como bubble de
error sin tipear (el contenido viene listo para mostrarse).

### 2.3 `POST /serie-temporal`

Refresh ligero de la serie temporal del gráfico al cambiar la ventana
(7/30/90/ciclo). **No invoca al LLM**, solo recalcula la consulta SQL.
Latencia esperada <100ms vs 3-5s de `/consulta`.

```json
// Request
{ "grafico_rule_id": "MORT_DIA_C001", "ventana_dias": "30", "rol": "jefe_centro" }
// Response
{ "serie_temporal": { /* mismo shape que en /consulta */ } }
```

### 2.4 `POST /accion`

Ejecuta acciones interactivas (por ahora solo `ENVIAR_CORREO` simulado).

```json
// Request (AccionRequest)
{
  "accion_id": "ENVIAR_CORREO",
  "destinatario": "gerencia@demo.com",
  "asunto": "Reporte de mortalidad",
  "rol": "jefe_centro",
  "usuario_id": "user_001",
  "contexto_grafico": { /* la serie_temporal previa */ }
}
// Response (AccionResponse)
{
  "status": "ok",                  // "ok" | "error_rbac" | "error_parser"
  "mensaje_usuario": "Correo enviado correctamente.",
  "correo_simulado": {
    "de": "user_001@demo.com",
    "para": "gerencia@demo.com",
    "asunto": "Reporte de mortalidad",
    "fecha": "2026-05-13 10:23",
    "cuerpo": "Buenos días,\n\nAdjunto...",
    "adjunto": {
      "nombre": "mortalidad_ctr001.png",
      "tamano_kb": "42 KB",
      "grafico_data": { /* serie_temporal — se re-renderiza con Chart.js */ }
    }
  }
}
```

### 2.5 `GET /riesgos`

Polling de alertas predictivas del motor causal. La UI lo llama al arrancar y
cada 30s.

```json
{
  "alertas": [...],
  "n_alertas": 2,
  "predictions": [
    { "rule_id": "SAL_OD_DECAY_BLOOM", "risk_score": 0.78, "..." },
    ...
  ]
}
```

### 2.6 `POST /pipeline/batch`

Reconstruye el índice vectorial (corre Gemini sobre todo el datamart, 6-8 min).
La UI lo invoca solo desde el botón "Ejecutar pipeline batch" (en este demo el
botón puede no estar visible).

```json
// Response (PipelineResponse)
{ "status": "completed" | "error", "result": {...}, "alerts": [...], "error": null }
```

### 2.7 Endpoints del módulo informe (solo si `modulos.informe.habilitado: true`)

- `GET /informe?usuario_id=...&entidad_id=...` → lista de consultas/acciones
  registradas para esa entidad.
- `POST /informe/accion` → registra una acción libre del usuario.
  Body: `{ usuario_id, entidad_id, texto }`.

### 2.8 Endpoints utilitarios

- `GET /` → sirve `webui/index.html`.
- `GET /health` → `{ "status": "ok", "service": "sistema_rag" }`.

---

## 3. Configuración: `config/domain.yaml` (la fuente autoritativa de la UI)

**Todo lo que es visible al usuario sale de este archivo.** El backend lo
expone vía `GET /domain` con un `public_dict()` que pasa el bloque `ui`
completo (passthrough) más la lista de ámbitos, roles, entidades y
consultas_sugeridas.

### 3.1 Bloque `ui` (los campos que la UI lee)

```yaml
ui:
  titulo: "Asistentes Virtuales"
  subtitulo: "Sistema integrado de gestión productiva acuícola"
  color_primario: "#eaeaea"                # background base
  color_sidebar: "#002c48"                 # sidebar (azul corporativo)
  color_acento:  "#C8102E"                 # accent (botones, hover, avatar)
  icono_sistema: "AV"                      # texto del logo si no hay logo_url
  icono_emoji:   "🐟"                      # emoji del empty-state
  logo_url:      ""                        # fallback: cuadrito con texto
  placeholder_consulta: "Consulta sobre centros, jaulas, lotes o pedidos..."

  flags:                                   # togglers de comportamiento
    mostrar_banner_causal: false
    conversaciones_como_combobox: true
    semillar_ambitos_en_sidebar: false
    autorenombrar_ambito_al_primer_mensaje: false
    modulo_informe_habilitado: true

  asistentes:                              # lista plana de "personas" del bot
    - id: engorda
      nombre: "Engorda"
      subtitulo: "Centros y jaulas"
      ambitos: [centros_cultivo, parametros_ambientales, lecturas_sensor,
                mortalidad_cultivo, eventos_engorda, recomendaciones_cosecha]
    - id: planta
      nombre: "Planta"
      subtitulo: "Lote y calibración"
      ambitos: [lotes_planta, propuestas_plantilla, pedidos_abiertos]
    - id: reproduccion
      nombre: "Reproducción"
      subtitulo: "Agua dulce"
      disabled: true                       # se renderiza con candado + opacidad
    - id: comercializacion
      nombre: "Comercialización"
      subtitulo: "Pedidos y clientes"
      disabled: true

  etiquetas:                               # textos i18n del sidebar
    rol: "Rol"
    usuario_id: "Usuario ID"
    conversaciones: "Asistentes"
    pipeline: "Pipeline"
    consultas_ejemplo: "Consultas de ejemplo"
    sin_consultas: "(sin consultas aún)"
    ver_informe: "Ver informe"

  botones:                                 # textos i18n de los botones
    nueva_conversacion: "Asistentes"
    ejecutar_pipeline: "Ejecutar pipeline batch"
    enviar: "Enviar"
    ver_informe: "Ver informe"
    registrar_accion: "Registrar"

  placeholders:
    consulta: "Escribe tu consulta..."
    accion: "Escribe una acción para registrar..."

  mensajes:                                # mensajes operativos
    banner_causal: "Alertas del motor causal detectadas"
    conversacion_nueva_titulo: "Nueva conversación"
    sin_ambitos_autorizados: "Sin asistentes autorizados para este rol."
    sin_sugerencias: "Sin sugerencias para este ámbito."
    cargando: "Cargando..."
    sin_respuesta: "Sin respuesta."
    respuesta_bloqueada: "Respuesta bloqueada."
```

### 3.2 Bloque `consultas_sugeridas`

Diccionario `{ ambito_id: ["pregunta 1", "pregunta 2", ...] }`. La UI debe
mostrar solo las del ámbito activo y filtradas por scopes del rol activo.

### 3.3 Bloque `roles` (RBAC)

```yaml
roles:
  - id: jefe_centro
    nombre: "Jefe de Centro"
    ambitos: [centros_cultivo, parametros_ambientales, lecturas_sensor,
              mortalidad_cultivo, eventos_engorda, recomendaciones_cosecha]
  - id: bioseguridad
    nombre: "Bioseguridad"
    ambitos: [...]
  - id: supervisor_planta
    nombre: "Supervisor de Planta"
    ambitos: [lotes_planta, propuestas_plantilla, pedidos_abiertos,
              eventos_engorda, recomendaciones_cosecha]
  - id: gerencia_produccion
    nombre: "Gerencia de Producción"
    ambitos: [/* todos */]
```

### 3.4 Bloque `entidades_principales`

Cada entidad expone su regex para que el frontend pueda extraer IDs del texto:

```yaml
entidades_principales:
  - nombre: "Centro de Cultivo"
    identificador: "centro_id"
    identificador_regex: "\\bCTR-\\d{3}\\b"
    prefijo_display: "Centro"
  - nombre: "Lote"
    identificador: "lote_id"
    identificador_regex: "\\bL[P]?-\\d{4}-\\d{4}\\b"
    prefijo_display: "Lote"
  # ... Jaula, Pedido, Plantilla
```

---

## 4. Configuración auxiliar: `webui/consultas_demo.json`

Servido como **archivo estático** por FastAPI (mount sobre `webui/`). Define
las "tarjetas precargadas" del sidebar para cada asistente, con plantillas
parametrizadas vía `{entidad}`.

```json
{
  "engorda": {
    "entidad_tipo": "centro",
    "entidad_label": "Centros de cultivo",
    "entidades": [
      { "id": "CTR-001", "etiqueta": "Centro 001 — Patagonia Norte", "entidad": "Centro 001" },
      { "id": "CTR-002", "etiqueta": "Centro 002 — Patagonia Sur",   "entidad": "Centro 002" },
      ...
    ],
    "consultas": [
      { "display": "¿Cómo está?", "template": "¿Cómo está el {entidad}?" },
      { "display": "Gráfico de mortalidad",
        "template": "Mortalidad de la última semana en el {entidad}",
        "grafico_rule_id": "MORT_DIA_C001" },
      { "display": "Generar plantilla de cortes",
        "template": "Genera plantilla de cortes para el {entidad}",
        "accion_rule_id": "GEN_PLANTILLA_LP_2026_0508",
        "lote_id_aplicable": "LP-2026-0508",
        "roles_permitidos": ["supervisor_planta", "gerencia_produccion"] }
    ]
  },
  "planta": { /* simétrico, con lotes */ }
}
```

**Convención de plantillas**:
- `template` con `{entidad}` se sustituye por `entidad` de la fila clickeada.
- Si trae `grafico_rule_id` → la UI lo pone en `window._graficoPendiente` y lo
  manda en el siguiente `POST /consulta` como `grafico_rule_id` + `ventana_dias`.
- Si trae `accion_rule_id` → idem como `accion_rule_id`.
- Si trae `roles_permitidos` → la UI debe deshabilitar la tarjeta para roles
  fuera de la lista (visual: opacity 0.45 + tooltip).

---

## 5. Artefactos que devuelve el LLM y cómo renderizarlos

### 5.1 `serie_temporal` (gráficos Chart.js)

Devuelta por `/consulta` cuando el usuario clickeó una plantilla con
`grafico_rule_id`, o por `/serie-temporal` al cambiar la ventana.

**Shape**:
```json
{
  "tipo": "tipo_1" | "tipo_4" | "rbac_denied",
  "grafico_rule_id": "MORT_DIA_C001",
  "titulo": "Mortalidad diaria — Centro 001",
  "subtitulo": "Últimos 30 días · CTR-001",
  "ventana_actual": "30",
  "unidad_y": "peces",
  "puntos": [
    { "x": "2026-04-13", "y": 12, "color": "gris" | "azul" | "rojo" },
    ...
  ],
  "rango_objetivo_y": {                   // solo en tipo_4
    "y_min": 6.5, "y_max": 8.0, "etiqueta": "Zona objetivo"
  },
  "metricas_resumen": {                   // hasta 4 KPIs debajo del gráfico
    "promedio":  { "etiqueta": "Promedio",  "valor": 8.2, "unidad": "peces/día" },
    "maximo":    { "etiqueta": "Máximo",    "valor": 21,  "unidad": "peces" },
    "tendencia": { "etiqueta": "Tendencia", "valor": "↗ +12%", "unidad": "" },
    ...
  }
}
```

**Render** (Chart.js v4 + plugin `chartjs-plugin-annotation`):
- `tipo_1` → barras (color por punto: gris/azul/rojo).
- `tipo_4` → línea con zona objetivo sombreada (caja anotación).
- `rbac_denied` → tarjeta roja con título + subtítulo de bloqueo, sin canvas.

Ventanas por tipo (selector debajo del gráfico):
```js
const _GRAF_VENTANAS_POR_TIPO = {
  tipo_1: [
    { id: '7', label: 'Última semana' },
    { id: '30', label: 'Últimos 30 días' },
    { id: '90', label: 'Últimos 90 días' },
    { id: 'ciclo', label: 'Ciclo' },
  ],
  tipo_4: [
    { id: '30', label: 'Últimos 30 días' },
    { id: '90', label: 'Últimos 90 días' },
    { id: 'ciclo', label: 'Ciclo completo' },
  ],
};
```

Al hacer click en un botón de ventana → `POST /serie-temporal` y reemplazar
el interior de la `.grafico-card` sin agregar bubbles nuevos.

### 5.2 `archivo_descargable`

Cuando la respuesta trae este campo, montar tarjeta debajo del bubble:

```json
{
  "nombre_archivo": "plantilla_LP-2026-0508.xlsx",
  "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "base64_contenido": "UEsDBBQABgAIAAA..."
}
```

Click en "Descargar" → `atob(base64)` → `Blob` → `URL.createObjectURL` → `<a download>`.

### 5.3 `tablero_kpi` (asistente Gerencia)

```json
{
  "titulo": "Resumen ejecutivo",
  "subtitulo": "Periodo: abril 2026",
  "kpis": [
    {
      "id": "biomasa_total",
      "etiqueta": "Biomasa total",
      "valor": "2.450 t",
      "color": "verde" | "amarillo" | "rojo" | "gris",
      "target": "2.300 t",
      "delta": "+6.5%",
      "delta_tipo": "positivo" | "negativo" | "neutral",
      "descripcion": "Acumulado en 4 centros"
    },
    { "bloqueado": true, "etiqueta": "Mortalidad", "mensaje": "Sin permisos para este KPI" }
  ],
  "trend": { /* serie_temporal opcional para línea de tendencia */ },
  "tabla": {                          // tabla opcional al pie
    "titulo": "Detalle por centro",
    "columnas": ["Centro", "Biomasa", "FCR"],
    "filas": [
      ["CTR-001", "850 t", "1.42"],
      ...
    ]
  }
}
```

### 5.4 `correo_simulado` (devuelto por `/accion`)

Ver §2.4 para el shape. La UI lo renderiza como una "tarjeta de correo" con
banda verde de éxito, campos `De/Para/Asunto/Fecha`, cuerpo del mensaje,
adjunto clickeable que abre un modal con el gráfico re-renderizado a tamaño
grande.

### 5.5 `causal_context` (banner amarillo)

Si la respuesta trae `causal_context` no-vacío, mostrar el banner causal
(salvo que `ui.flags.mostrar_banner_causal === false`). Texto desde
`ui.mensajes.banner_causal`.

### 5.6 `chunks_used` + `scopes` (refs colapsables)

Debajo de cada bubble del asistente, mostrar pildorita "N chunks utilizados"
con flecha. Al expandir muestra:
- "Ámbitos consultados: a, b, c"
- "Chunks verificados criptográficamente: N"
- "Routing ambiguo - se usó LLM para resolver ámbito" (si `ambiguous_routing`).

---

## 6. Flujo de bootstrap (qué hace el frontend al cargar)

```js
(async () => {
  const [resDomain] = await Promise.all([
    fetch('/domain'),
    fetch('/static/consultas_demo.json').then(r => r.json()),
  ]);
  DOMAIN = await resDomain.json();
  applyDomain(DOMAIN);               // colores CSS, títulos, logo, role select
  if (state.conversations.length === 0) newConversation();
  renderConvList();
  renderSidebarEntidades();
  renderChat();
  pollRiesgos();
  setInterval(pollRiesgos, 30000);
})();
```

### 6.1 `applyDomain(d)` — qué inyecta dinámicamente

| Elemento UI                    | Fuente en `domain.yaml`             | Tipo                       |
| ------------------------------ | ----------------------------------- | -------------------------- |
| `--accent` CSS var             | `ui.color_acento`                   | color                      |
| `--bg` CSS var                 | `ui.color_primario`                 | color                      |
| `--sidebar` CSS var            | `ui.color_sidebar`                  | color                      |
| `--text` / `--muted`           | calculado por luminancia del bg     | derivado                   |
| `document.title`               | `ui.titulo` o `domain.name`         | texto                      |
| favicon                        | `ui.icono_sistema` + accent (SVG inline) | data-URI              |
| logo del sidebar               | `ui.logo_url` o texto `icono_sistema` | img o texto              |
| empty-state (icono + título)   | `ui.icono_emoji`, `ui.titulo`, `ui.subtitulo` | texto             |
| placeholder input              | `ui.placeholders.consulta`          | texto                      |
| selector de rol                | `domain.roles[]`                    | options dinámicas          |
| labels y botones               | `ui.etiquetas`, `ui.botones`        | textos                     |

### 6.2 Estado global del frontend

```js
let DOMAIN = null;             // populated by /domain
let CONSULTAS_DEMO = null;     // populated by /static/consultas_demo.json
let _uiFlags = {};             // copy of DOMAIN.ui.flags
let _domainIcon = '';          // copy of DOMAIN.ui.icono_sistema
let _asistenteSeleccionadoId = null;   // 'engorda' | 'planta' | ...

const state = {
  conversations: [],           // [{ id, title, messages: [{role, content, chunks, scopes, ambiguous}], ambito? }]
  currentId: null,
  busy: false,
  byRut: {},                   // { 'CTR-001': [{ts, texto, respuesta}, ...] }
  byUser: {},                  // { 'user_001': [...] }
  activoRut: null,
};

// Pendings consumibles una sola vez en el próximo /consulta:
window._graficoPendiente = null;     // { ruleId, ventanaDias }
window._accionPendiente  = null;     // { ruleId }
window._kpiPendiente     = null;     // { ruleId }
window._ultimoCentroId   = null;     // se manda como campo extra del payload
window._ultimoLoteId     = null;
window._ultimaSerieTemporal = null;  // para reusar en @enviar correo
```

---

## 7. RBAC visual en el frontend

El backend hace el RBAC autoritativo, pero el frontend hace pre-checks
léxicos para **cortocircuitar consultas obviamente fuera de scope** y evitar
que el LLM degrade hacia chunks de scopes adyacentes. Patrones (de
`KEYWORDS_POR_DOMINIO_EXCLUSIVO`):

```js
const KEYWORDS_POR_DOMINIO_EXCLUSIVO = {
  planta:           { palabras: ['lote','pedido','plantilla','cliente','bin','calibración'],
                      scopes: ['lotes_planta','propuestas_plantilla','pedidos_abiertos'] },
  recomendaciones:  { palabras: ['recomendación de cosecha','ventana de cosecha','listo para cosechar'],
                      scopes: ['recomendaciones_cosecha'] },
  mortalidad:       { palabras: ['mortalidad','peces muertos','depredación','lobo marino','srs','bkd'],
                      scopes: ['mortalidad_cultivo'] },
  ambientales:      { palabras: ['oxígeno disuelto','salinidad','fitoplancton','secchi','bloom'],
                      scopes: ['parametros_ambientales','lecturas_sensor'] },
};
```

Si el texto del usuario tiene palabras de un dominio y el rol no tiene scope
en ese dominio → mostrar bubble local "No tengo acceso a esa información para
tu rol activo." sin pegarle al backend.

**RBAC visual del recuadro de acción (input amarillo `@enviar`)**: solo
`supervisor_planta` y `gerencia_produccion` pueden tipear. Otros roles ven
input deshabilitado con placeholder "Esta acción requiere rol Supervisor de
Planta o Gerencia de Producción".

---

## 8. Normalización de queries antes del backend

Algunas frases en español natural no matchean los chunks indexados con
underscores. La UI las reemplaza antes del POST:

```js
const REEMPLAZOS_NATURALIZACION = {
  'lobo marino':        'lobo_marino',
  'lobos marinos':      'lobo_marino',
  'daño mecánico':      'dano_mecanico',
  'sin causa aparente': 'sin_causa_aparente',
  'depredación':        'lobo_marino',
};
```

La burbuja del usuario muestra el texto original. El payload lleva el
normalizado.

---

## 9. Acciones con prefijo `@` en el recuadro amarillo

Sintaxis soportada actualmente:

```
@enviar <email> <asunto del correo>
```

Parser: `/^@enviar\s+(\S+@\S+\.\S+)\s+(.+)$/i`. Requiere:
1. Una `serie_temporal` previa en memoria (`window._ultimaSerieTemporal`).
2. Rol con permiso visual (`supervisor_planta` o `gerencia_produccion`).

Llama `POST /accion` con `accion_id: 'ENVIAR_CORREO'` y renderiza la tarjeta
de correo simulado (ver §5.4) con banda de "procesando" mientras espera la
respuesta. Cualquier prefijo `@otra-cosa` muestra "Acción no reconocida".

---

## 10. Persistencia local del frontend (acordeón "por entidad")

Cada respuesta del backend trae `entidades_efectivas: []`. La UI usa esos
IDs para clasificar la consulta en uno de dos diccionarios:

- **CTR-NNN** → bucket de centros (visible bajo asistente Engorda).
- **L[P]-YYYY-NNNN** → bucket de lotes (visible bajo asistente Planta).

Cada bucket renderiza un acordeón con histórico de consultas y respuestas
truncadas a 140 chars. Click → scroll al mensaje correspondiente en el chat.

Adicionalmente, `state.byRut[ent]` y `state.byUser[uid]` arman el sidebar
"POR RUT" / "POR USUARIO" del módulo informe.

---

## 11. Guardrails del backend (los errores que la UI puede recibir)

Definidos en `config/security.yaml`. Cuando bloquea:

```json
{
  "blocked": true,
  "respuesta": "Tu consulta contiene un patrón que el sistema bloqueó por seguridad."
}
```

Patrones de bloqueo de entrada (regex IGNORECASE):
- Prompt injection: `ignore (previous|all) instructions`, `system prompt`, `jailbreak`, `act as`.
- SQL/XSS: `<script`, `DROP TABLE`, `UNION SELECT`, `OR 1=1`, `eval(`.
- Específicos del dominio: `SELECT * FROM centro_cultivo;`, "dame todos los centros",
  "exportar toda la base", "config.yaml", "password|api_key|secret".

La UI no necesita conocer los patrones, solo respetar `blocked`/`error` en la
respuesta y mostrar el mensaje sin tipearlo.

---

## 12. Estructura del DOM (layout principal)

```html
<div id="app">
  <aside id="sidebar">
    <div id="sidebar-header">
      <div id="sidebar-logo">
        <div class="logo-icon" id="logo-icon"></div>
        <div>
          <div class="logo-text" id="logo-title"></div>
          <div class="logo-sub"  id="logo-sub"></div>
        </div>
      </div>
    </div>
    <div id="sidebar-body">
      <div class="sidebar-section">          <!-- 1. ROL -->
        <label id="lbl-rol" for="sel-rol"></label>
        <select id="sel-rol" onchange="onRolChange()"></select>
      </div>
      <div class="sidebar-section">          <!-- 2. USUARIO ID -->
        <label id="lbl-uid" for="inp-uid"></label>
        <input id="inp-uid" type="text" value="user_001" />
      </div>
      <div class="sidebar-section">          <!-- 3. ASISTENTES + ENTIDADES -->
        <div class="section-title" id="lbl-convs"></div>
        <div id="consultas-sugeridas-list"></div>
        <div id="entidades-por-asistente"></div>
      </div>
      <div class="sidebar-section" id="sec-reportes">   <!-- 4. REPORTES -->
        <div class="section-title">REPORTES</div>
        <div id="reportes-lista"></div>
      </div>
    </div>
  </aside>

  <div id="overlay" onclick="closeSidebar()"></div>

  <div id="main">
    <div id="topbar"> ... </div>
    <div id="causal-banner"> ... </div>
    <div id="chat">
      <div id="chat-inner">
        <div id="empty-state">
          <div class="big-icon" id="empty-icon"></div>
          <h2 id="empty-title"></h2>
          <p  id="empty-desc"></p>
        </div>
        <!-- Aquí se insertan dinámicamente .msg.user y .msg.system -->
      </div>
    </div>
    <div id="input-area">
      <div id="input-wrap">
        <textarea id="input"></textarea>
        <button id="btn-send" onclick="sendQuery()"></button>
      </div>
      <div id="accion-wrap">                  <!-- input @ amarillo -->
        <textarea id="input-accion"></textarea>
        <button id="btn-accion" onclick="enviarAccion()"></button>
      </div>
    </div>
    <!-- Modal de informe (legacy, opcional) -->
    <div id="informe-overlay"></div>
    <div id="informe-modal"> ... </div>
  </div>
</div>
```

---

## 13. Paleta de variables CSS

Inyectadas en `:root` por `applyDomain()`. La UI las debe usar para que el
tema cambie con solo editar `domain.yaml`.

```css
:root {
  --bg:           /* ui.color_primario */;
  --sidebar:      /* ui.color_sidebar */;
  --surface:      /* derivado: shadeColor(bg, -25) */;
  --border:       /* derivado: shadeColor(bg, -30) */;
  --accent:       /* ui.color_acento */;
  --text:         /* #1a1a1a si bg es light, #ececec si dark */;
  --muted:        /* #6B7280 light, #8e8ea0 dark */;
  --sidebar-text: /* idem según luminancia del sidebar */;
  --sidebar-muted:/* idem */;
  --success:      #22c55e;
  --warn:         #f59e0b;
  --danger:       #ef4444;
  --radius:       12px;
  --sidebar-w:    260px;
}
```

---

## 14. Eventos y handlers principales

| Trigger                                | Handler                              | Efecto                                                        |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Cambio del `<select id="sel-rol">`     | `onRolChange()`                      | Re-render asistentes + RBAC del input acción                  |
| Click en tarjeta asistente             | `seleccionarAsistente(id)`           | Cambia panel de entidades                                     |
| Click en fila de entidad (centro/lote) | `toggleSug(headerBtn)`               | Despliega/colapsa acordeón                                    |
| Click en plantilla `{entidad}`         | `aplicarConsultaConEntidad(...)`     | Llena el input + setea `_ultimoCentroId`/`_ultimoLoteId`      |
| Click en plantilla con `grafico_rule_id` | setea `_graficoPendiente` + sendQuery() | Devuelve `serie_temporal` en la respuesta                  |
| Click en plantilla con `accion_rule_id`  | setea `_accionPendiente`           | Devuelve `archivo_descargable`                                |
| Enter en `<textarea id="input">`       | `sendQuery()`                        | `POST /consulta`                                              |
| Enter en `<textarea id="input-accion">`| `enviarAccion()`                     | `POST /accion` (si `@enviar ...`) o `/informe/accion`         |
| Click en botón de ventana del gráfico  | `recargarGraficoVentana(card, v)`    | `POST /serie-temporal` (sin LLM)                              |
| Setinterval 30s                        | `pollRiesgos()`                      | `GET /riesgos` + actualiza badge de alertas                   |

---

## 15. Lifecycle de una consulta (paso a paso)

```
USUARIO escribe + Enter
   │
   ▼
sendQuery()
   ├─► _validarAccesoConsulta(text, rol)        ← pre-check léxico RBAC
   │      └─► si rebota: mostrar bubble local y return
   ├─► _normalizarQuery(text)                   ← REEMPLAZOS_NATURALIZACION
   ├─► armar payload con HINT_BREVEDAD + pendings consumibles
   │      (grafico_rule_id, accion_rule_id, kpi_rule_id, ventana_dias)
   ├─► appendUserBubble(text)                   ← burbuja con texto ORIGINAL
   ├─► appendThinking()                         ← 3 puntitos animados
   │
   ├─► POST /consulta
   │
   ├─► thinkEl.remove()
   ├─► si data.blocked || data.error:
   │      └─► bubble de error, registrar interacción y return
   │
   ├─► appendSystemBubbleTyped(answer, chunks, scopes, ambiguous)
   │      (efecto de tipeo carácter por carácter, 6-22ms/char)
   │
   ├─► si data.serie_temporal && tipo !== 'rbac_denied':
   │      └─► renderTarjetaGrafico(serie, host, text)
   ├─► si data.archivo_descargable:
   │      └─► renderTarjetaDescarga(archivo, host)
   ├─► si data.tablero_kpi:
   │      └─► renderTarjetaKPI(tablero, host)
   ├─► si data.causal_context no vacío:
   │      └─► showCausalBanner(...)
   │
   ├─► _registrarConsultaEnEntidad(text, entidades_efectivas, answer)
   │      └─► alimenta acordeón por centro/lote
   ├─► _registrarInteraccion(...)               ← alimenta sidebar POR RUT/USUARIO
   │
   └─► setBusy(false) + scrollBottom()
```

---

## 16. Dependencias del frontend

- **HTML/CSS/JS vanilla** — sin React/Vue/Angular.
- **Chart.js v4.4.1** (CDN cloudflare).
- **chartjs-plugin-annotation 3.0.1** (CDN cloudflare).
- Sin bundler, sin build step. El archivo `webui/index.html` es servido tal
  cual por FastAPI con `Cache-Control: no-store` (cambios en caliente).

CDN URLs:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/3.0.1/chartjs-plugin-annotation.min.js"></script>
```

---

## 17. Mapa de archivos relevantes

| Archivo                                   | Responsabilidad                                          |
| ----------------------------------------- | -------------------------------------------------------- |
| `main.py`                                 | FastAPI app + endpoints `/consulta`, `/domain`, etc.     |
| `webui/index.html`                        | Toda la UI (HTML + CSS + JS, ~3146 líneas)               |
| `webui/consultas_demo.json`               | Catálogo de tarjetas precargadas por asistente           |
| `config/domain.yaml`                      | Fuente autoritativa de UI (colores, textos, ámbitos, roles) |
| `config/domain_loader.py`                 | Construye `public_dict()` para `/domain`                 |
| `config/security.yaml`                    | Guardrails de entrada/salida + RBAC                      |
| `config/templates.yaml`                   | Cómo se serializan filas del datamart a texto natural    |
| `config/modulos.yaml`                     | Toggle del módulo `informe`                              |
| `orchestrator/rules.yaml`                 | Reglas SQL por ámbito (no las consume el frontend directamente) |
| `agents/rag.py`                           | Pipeline LLM: extract → retrieve → generate → validate   |
| `agents/orchestrator.py`                  | Pipeline batch + motor causal                            |
| `datamart/datamart_salmonera.db`          | SQLite con datos de demo                                 |
| `qdrant_data/`                            | Índice vectorial local                                   |

---

## 18. Datos de referencia del demo (para mockups)

- **Fecha base**: 27 de abril de 2026.
- **CTR-001 "Centro Patagonia Norte"** (Quellón): peso 4.8 kg, biomasa 850 t,
  FCR 1.42, 600 días de ciclo, `ventana_cosecha`.
- **Recomendación vigente**: cosechar **entre 4 y 8 de mayo de 2026**.
- **Lote LP-2026-0508**: 850 t desde CTR-001, fecha estimada 6 mayo.
- **Plantilla T-Mixta-Cliente-A**: cubre 100% de P-2026-0089 (120 t HOG),
  100% de P-2026-0108 (90 t WOG), 65% de P-2026-0094 (52 t fileteado).

Estos valores aparecen literalmente en las respuestas del LLM y son los que
las tarjetas de gráfico/correo simulado renderizan.

---

## 19. Checklist para construir una nueva implementación de la UI

- [ ] Bootstrap: `Promise.all([fetch('/domain'), fetch('/static/consultas_demo.json')])`.
- [ ] Inyectar variables CSS (`--accent`, `--bg`, `--sidebar`...) desde `ui.color_*`.
- [ ] Inyectar título, subtítulo, favicon, logo, placeholders desde `ui.*`.
- [ ] Renderizar `<select id="sel-rol">` con `roles[]`.
- [ ] Renderizar lista de asistentes desde `ui.asistentes[]` (estados active/selected/disabled+candado).
- [ ] Para asistente seleccionado: leer `consultas_demo.json[asisId]` y mostrar
      acordeón de entidades + plantillas. Aplicar `roles_permitidos` por plantilla.
- [ ] `consultas_sugeridas[ambito_id]` filtradas por scopes del rol.
- [ ] Sección REPORTES: filtrar plantillas con `grafico_rule_id` (renderizar como botones).
- [ ] Implementar `sendQuery()` con: pre-check léxico RBAC, normalización,
      sufijo de brevedad, pendings consumibles (grafico/accion/kpi).
- [ ] Manejar todos los artefactos de la respuesta: `respuesta`, `serie_temporal`,
      `archivo_descargable`, `tablero_kpi`, `causal_context`, `chunks_used+scopes`,
      `blocked`/`error`, `entidades_efectivas`.
- [ ] Selector de ventana del gráfico → `POST /serie-temporal` (no LLM).
- [ ] Input amarillo `@enviar` → `POST /accion` con `accion_id: ENVIAR_CORREO`.
      Render tarjeta de correo + modal de gráfico al click "Ver".
- [ ] Polling cada 30s a `GET /riesgos`, actualizar badge + lista de alertas.
- [ ] Render incremental de bubbles con efecto de tipeo (6-22ms/char).
- [ ] Markdown ligero en bubbles del asistente (negritas, listas, code blocks).
- [ ] Sidebar "POR ENTIDAD" alimentado desde `entidades_efectivas` (regex de
      `domain.entidades[].identificador_regex`).
- [ ] RBAC visual del recuadro de acción (solo roles permitidos para `@`).
- [ ] Mobile: hamburguesa que toggle `#sidebar.open`.

---

## 20. Apéndice — Snippets de referencia

### 20.1 Llamada mínima al LLM

```js
async function consultarLLM(texto, rol, usuarioId) {
  const res = await fetch('/consulta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consulta: texto,
      usuario_id: usuarioId,
      rol: rol,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

### 20.2 Render mínimo del bubble del asistente

```js
function appendSystemBubble(text, chunks, scopes) {
  const inner = document.getElementById('chat-inner');
  const idx = document.querySelectorAll('.msg.system').length;
  const div = document.createElement('div');
  div.className = 'msg system';
  div.innerHTML = `
    <div class="avatar">${esc(_domainIcon)}</div>
    <div class="bubble-wrap">
      <div class="bubble">${renderMarkdown(text)}</div>
      ${chunks > 0 ? `
        <div>
          <span class="refs-toggle" onclick="toggleRefs(${idx})">
            <span class="arrow">▶</span> ${chunks} chunks utilizados
          </span>
          <div class="refs-list" id="refs-${idx}">
            <div class="ref-item">Ámbitos consultados: ${esc(scopes.join(', '))}</div>
          </div>
        </div>
      ` : ''}
    </div>`;
  inner.appendChild(div);
}
```

### 20.3 Inyección de variables CSS desde `/domain`

```js
function applyDomain(d) {
  const ui = d.ui || {};
  document.documentElement.style.setProperty('--accent',  ui.color_acento  || '#c96442');
  document.documentElement.style.setProperty('--bg',      ui.color_primario|| '#1a1a1a');
  document.documentElement.style.setProperty('--sidebar', ui.color_sidebar || '#111111');
  document.title = ui.titulo || d.domain.name;
  document.getElementById('input').placeholder = ui.placeholder_consulta || '';
  // ... renderizar select de roles, logo, empty state, asistentes ...
}
```

---

**Fin del documento.**
Para extender el dominio sin tocar Python: editar `config/domain.yaml`,
`webui/consultas_demo.json` y opcionalmente `orchestrator/rules.yaml` +
`config/templates.yaml`. La UI se redibuja automáticamente al refrescar.
