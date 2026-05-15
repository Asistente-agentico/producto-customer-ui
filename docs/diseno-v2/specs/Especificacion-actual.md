# Especificación funcional · UI Asistente Salmonera

> Documento para validar con Claude Code el refactoring que implica llevar
> el prototipo actual (`/index.html` + JSX inline) a la arquitectura de
> producción descrita en `customer_ui_spec.md`.
>
> **Fuente del prototipo**: este proyecto Omelette. Stack actual:
> React 18 + Babel runtime + Tailwind CDN + JSX en archivos sueltos.
>
> **Fuente del backend de referencia**: `uploads/LLM_usuario.md` —
> FastAPI + endpoint único `/consulta` + `/domain` + `/accion` + `/riesgos`.
> El producto final podría ir por la versión simplificada (LLM_usuario.md)
> o la versión modular en Docker separados (customer_ui_spec.md).

---

## 1. Arquitectura visual del producto

El producto es una **shell única** capability-driven. La shell se compone
de cuatro zonas persistentes y varias zonas condicionales:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TOPBAR (h-12 · siempre)                                               │
│  [📅 fecha] [⏱ Última] [📋 Pendientes (N)] [📊 KPI] · · ·              │
│      ......................................... [Chat ML Reportes Acc] │
│      ............................. [🔔 N] [🐟 Engorda v2.4.1]         │
├──────────────┬─────────────────────────────────────────────────────────┤
│              │  KPI BAND (condicional · toggle desde TopBar)           │
│  SIDEBAR     │  [● Mortalidad 27 u/d] [● O₂ 6.2] ... [ocultar]         │
│  (solo en    │                                                         │
│   Chat)      ├─────────────────────────────────────────────────────────┤
│              │                                                         │
│  Marca       │  VISTA ACTIVA                                           │
│              │  · Chat (con conversación y banda)                      │
│  Ámbitos →   │  · Reportes (catálogo por gerencia)                     │
│  Temáticas   │  · Acciones (cola + detalle + audit)                    │
│              │  · on-line (KPIs streaming SSE — módulo KPIs)           │
│              │  · ML (vista del módulo Machine Learning)               │
│  Footer →    │                                                         │
│  Usuario     │                                                         │
│              │                                                         │
├──────────────┤                                                         │
│              │  COMPOSER (solo en Chat)                                │
│              │  textarea + tools + enviar                              │
├──────────────┴─────────────────────────────────────────────────────────┤
│  SITE FOOTER (h-7 · siempre)                                           │
│  Powered by OPCiber · © 2026 · Todos los derechos reservados           │
└────────────────────────────────────────────────────────────────────────┘
```

### Reglas de visibilidad

| Zona | Cuándo se muestra |
|---|---|
| TopBar + Footer | Siempre, en todas las vistas (excepto login y bootstrap) |
| Sidebar (288px) | **Solo en Chat** (incluyendo empty state). En otras vistas se oculta para dar ancho completo al contenido. |
| KPI Band | Solo si módulo KPIs está habilitado **Y** el usuario hace toggle desde el botón "KPI" de la TopBar. Inicia oculta. |
| Composer | Solo en Chat / empty state |

---

## 2. Vistas del producto

### 2.1 Login (pre-shell)
- Pantalla completa, sin TopBar ni Sidebar
- Footer "Powered by OPCiber" presente
- Versión del producto en cluster flotante arriba a la derecha
- Dos modos según `AUTH_MODE`: formulario interno o redirect a IdP externo

### 2.2 Bootstrap (pre-shell · transitorio)
- Splash mientras se carga `/capabilities`
- Muestra pasos secuenciales:
  1. Sesión autenticada
  2. Configuración recibida
  3. Marca del cliente aplicada
  4. Permisos del usuario cargados
  5. Módulos opcionales detectados ← refleja qué módulos están contratados
  6. Conversaciones recuperadas
  7. Asistente listo
- Auto-avanza al Chat al completarse

### 2.3 Chat (vista principal)
- Empty state al inicio (sin mensajes)
- El usuario tipea consultas en el composer
- El asistente responde con texto + artefactos embebidos:
  - Gráfico de serie temporal
  - Banner causal (severidad media/alta)
  - Predicción ML (solo si módulo ML está activo)
  - Stub de reporte descargable (solo si módulo Reportes activo)
  - Stub de acción propuesta (solo si módulo Acciones activo)
- Cada mensaje (usuario y asistente) tiene botón individual de **colapsar/expandir**

### 2.4 Reportes (vista del módulo Reportes)
- Título: "Reportes Gerencia {gerencia del usuario}"
- Subtítulo: "Catálogo de reportes pre acordados"
- Filtro segmentado: Todos · Habilitados · No habilitados (con contadores)
- Grid de 2 columnas con tarjetas de reporte
- Cada tarjeta muestra: ID, tipo (operativo/gerencial), nombre, descripción, formatos disponibles (XLS · PDF · PPT · PBI), dueño del reporte, versión actual, tipo
- Los no habilitados aparecen atenuados con badge `🔒 razón` (rol Gerencia, rol Finanzas, etc.)
- Botones: Previsualizar (abre panel lateral derecho) · Generar
- **No hay reportes ad-hoc**
- **No se exhibe el proveedor de nube** (Azure, etc.). Los formatos disponibles se cargan dinámicamente según las herramientas corporativas del cliente.

### 2.5 Acciones (vista del módulo Acciones)
- Cola lateral izquierda (320px) con todas las acciones, agrupadas por estado:
  pendiente · esperando aprobación · aprobada · ejecutada · rechazada · fallida
- Detalle a la derecha con:
  - Tipo (ENVIAR_CORREO · WHATSAPP · AGENTE_IA)
  - Riesgo (bajo · medio · alto)
  - Estado actual con badge
  - Banner de aprobación pendiente cuando aplique (con nombre y rol del aprobador externo)
  - Parámetros editables hasta que el tercero apruebe
  - Audit log completo con timestamp, actor, acción y detalle
  - Retención del audit log declarada (5 años)
- **Doble custodia**: las acciones de riesgo medio/alto requieren aprobación externa antes de ejecutar
- Botones: Editar borrador · Bloqueado hasta aprobación · Solicitar aprobación · Descartar

### 2.6 on-line (vista del módulo KPIs — streaming)
- Dashboard de KPIs en tiempo real vía SSE
- Es la vista completa del módulo KPIs (más detalle que la banda inline)
- Misma fuente de datos que la banda, distinto layout

### 2.7 ML (vista del módulo Machine Learning)
- Pendiente de diseño. El módulo genera predicciones y recomendaciones
  basadas en data del módulo central. Devuelve artefactos al chat
  (no se navega directamente).

---

## 3. Componentes específicos

### 3.1 TopBar (cabecera)

De izquierda a derecha, todos a altura 32px:

1. **Fecha** (sin panel): `📅 jue, 14 may 2026` — solo texto sobre el bg de la cabecera
2. **Botón "Última"** (toggle on/off): cuando ON, muestra una conversación de ejemplo precargada en el thread del chat. Click otra vez la oculta. Inicia OFF.
3. **Botón "Pendientes (N)"** (toggle dropdown): abre lista de pendientes pendientes (aprobaciones, umbrales sobrepasados, etc.) filtrados por módulos activos del usuario.
4. **Botón "KPI"** (toggle on/off): abre/cierra la **banda de KPIs** debajo de la cabecera. Solo aparece si módulo KPIs está habilitado.
5. **(espacio)**
6. **Cluster de módulos**: Chat · ML · Reportes · Acciones · on-line
   - Habilitados en **verde**
   - Deshabilitados en **gris** con etiqueta `(No habilitado)`
   - Click navega a la vista del módulo
   - "Chat" es el módulo central, siempre activo
   - "on-line" es el nombre que apunta a la vista del módulo KPIs
   - Los KPIs **no aparecen aquí** como módulo separado (el botón KPI de la izquierda + la banda cubren ese caso)
7. **Campana de notificaciones** con badge de no leídas
8. **Asistente activo + versión**: `🐟 Engorda · v2.4.1`

### 3.2 Sidebar (panel lateral izquierdo · solo en Chat)

288px ancho, fondo navy `#0A2540`, texto blanco.

**Marca arriba**:
- Logo + título "Tu Asistente Asistente Virtual" + subtítulo "tu apoyo operativo"

**Panel principal**:
- Lista de **ámbitos autorizados** del usuario (filtrados vía JWT/permisos):
  - Mortalidad
  - Calidad de agua
  - Productividad
  - (n autorizados según rol + gerencia)
- Inician **cerrados**. Click los expande.
- Dentro de cada ámbito, **agrupación por semana** (últimas 4 semanas):
  - Esta semana · Semana pasada · Hace 2 semanas · Hace 3 semanas
- Cada item de temática muestra: `fecha · título de la temática (configurado en el producto)`
- Click en una temática la expande mostrando las conversaciones individuales

**Footer del sidebar**:
- Nombre del usuario · Rol · Gerencia
- Separado del listado por una línea sutil

### 3.3 Banda de KPIs

- Fondo `#FFFCF5` (crema muy claro) — diferenciable del paper del chat
- 5 KPIs como **números coloreados** según severidad:
  - **Verde**: sobre cota
  - **Amarillo**: cerca de cota
  - **Rojo**: bajo cota
- Cada KPI muestra: dot de color · label pequeño · número grande · chevron
- Click expande inline:
  - Detalle con título completo, valor, delta, botón cerrar (X)
  - Gráfico que lo representa: line · bar · gauge · progress
  - Stats adicionales (3 métricas debajo del gráfico)
- Múltiples KPIs pueden estar expandidos al mismo tiempo
- Configurable por asistente + rol + gerencia
- Botón "ocultar" en la esquina superior derecha sincroniza con el botón KPI de la TopBar

### 3.4 Composer (solo en Chat)

- Textarea multi-línea
- Status arriba a la derecha: `modo · conversación` o `generando…` durante respuesta
- Toolbar: Adjuntar · Voz · Plantillas
- Botón Enviar (coral) — `↵` envía, `⇧↵` nueva línea
- Sin chips de scope (eliminados)

### 3.5 Mensaje en el chat (turno del asistente)

- Header pequeño con timestamp + botón "colapsar/expandir"
- Texto del LLM (markdown ligero)
- Artefactos embebidos según lo emitido por el LLM
- Outro con pregunta de seguimiento (cursiva, en gris)
- Cuando se colapsa: tarjeta pequeña con preview de 2 líneas + contador de artefactos ocultos

### 3.6 Paneles laterales derechos (overlay tipo Claude.ai)

Se abren contextualmente, no son permanentes:

- **Report Preview**: muestra preview tabular del Excel + botones de descarga (Excel · PDF · PowerPoint · Power BI, sin etiqueta de proveedor de nube)
- **Permisos / "¿Qué estoy viendo?"**: transparencia de filtros JWT aplicados, KPIs bloqueados, indicador de PII oculta

---

## 4. Modelo de datos y estado

### 4.1 Datos cargados al inicio (bootstrap)

Una única llamada `/capabilities` (o `/domain` en la versión LLM_usuario.md) entrega:

- **Identidad**: usuario (nombre, rol, gerencia, iniciales, id pseudo), tenant
- **Asistente activo**: nombre, subtítulo, versión, modelo LLM
- **Marca**: título, subtítulo, colores, logo, favicon
- **Módulos contratados**: cada uno con `estado` (`ok` | `hidden` | `locked` | `error`)
- **Ámbitos autorizados** y sus temáticas (con fechas y agrupación por semana)
- **Roles disponibles** y sus scopes
- **Entidades** con regex para extracción (CTR-XXX, LP-YYYY-NNNN, etc.)
- **KPIs del usuario** (configurados por rol + gerencia): valores iniciales, umbrales, severidad, tipo de gráfico
- **Pendientes** existentes y **notificaciones** persistidas
- **Política de retención** por rol (auditor 5 años · analista 90 días)
- **Conversaciones recientes** del usuario

### 4.2 Tiempo real (después del bootstrap)

- **SSE**: actualizaciones de KPIs (si el módulo KPIs lo soporta)
- **Polling**: `/riesgos` cada 30s para alertas predictivas (modelo `LLM_usuario.md`)
- **Push de notificaciones**: nuevas alertas, aprobaciones aprobadas, etc.

### 4.3 Por consulta del usuario (LLM)

`POST /consulta` (o `/conversaciones/{id}/mensajes` en el modelo extendido) entrega:

- `respuesta` (markdown ligero)
- `chunks_used` + `scopes` + `ambiguous_routing` (para auditoría visible)
- Artefactos tipados:
  - `serie_temporal` (gráfico)
  - `causal_context` / `banner causal`
  - `archivo_descargable` (base64 inline o url firmada)
  - `tablero_kpi`
  - `accion_propuesta` (riesgo + parámetros editables)
  - `prediccion` (módulo ML, si está activo)
- `entidades_efectivas` (IDs extraídos)
- `blocked` / `error` (guardrails)

---

## 5. Capability-driven module behavior

Cada módulo opcional tiene 4 estados posibles que se respetan en toda la UI:

| Estado | Comportamiento |
|---|---|
| `ok` | Módulo activo, slot habilitado, artefactos aparecen |
| `hidden` | Cliente no contrató el módulo. Slot desaparece de la UI sin avisos |
| `locked` | Showcase comercial. Slot visible pero con candado y CTA "no incluido" |
| `error` | Módulo caído. Slot visible con indicador rojo "sin conexión", el resto sigue funcionando |

**Validación importante**: cuando el LLM emite un artefacto cuyo módulo no está disponible (ej: predicción ML con `mod_ml=hidden`), el artefacto **no se renderiza** y el LLM debe ser informado en el sistema prompt para que no lo mencione.

---

## 6. Reglas firmes de UX

1. **La pantalla arranca limpia**. Los toggles de TopBar (Última · Pendientes · KPI) inician en OFF. El chat inicia vacío con un hint.
2. **Toggles puros**: cada botón de cabecera abre/cierra con clicks sucesivos sobre el mismo botón. No se cierran al click afuera (excepto los dropdowns sí, por usabilidad).
3. **Footer "Powered by OPCiber · © 2026 · Todos los derechos reservados"** en todas las páginas.
4. **El cluster de módulos en cabecera** muestra módulos con su estado real:
   verde habilitado · gris `(No habilitado)`.
5. **El sidebar es contexto del chat**: no aparece en otras vistas.
6. **Los reportes son de la gerencia del usuario**. Filtros por habilitados / no habilitados según permisos. No hay reportes ad-hoc en este módulo (los reportes ad-hoc se generan inline en el chat como artefactos).
7. **El módulo Acciones es delicado**: requiere doble custodia para acciones medio/alto riesgo, audit log completo, retención configurable.
8. **PII oculta** por defecto. La transparencia de filtros JWT debe ser explícita y auditable (panel "¿Qué estoy viendo?").

---

## 7. Stack actual del prototipo vs producción

| Capa | Prototipo (este proyecto) | Producción (objetivo) |
|---|---|---|
| Framework | React 18 (UMD) + Babel runtime | React 18 + TypeScript estricto + Vite |
| Estilos | Tailwind CDN | Tailwind 3 con CSS vars desde `/capabilities.ui.colores` |
| Componentes | JSX hand-rolled | shadcn/ui (Radix + Tailwind copy-paste) |
| Iconos | SVG inline propios | `@tabler/icons-react` |
| Gráficos | SVG hand-rolled | Recharts |
| Tablas | HTML/CSS manual | TanStack Table |
| Paneles laterales | Componente custom (`PanelShell`) | shadcn `Sheet` |
| Dropdowns | Componente custom con `useState` + listener `mousedown` | shadcn `DropdownMenu` |
| Routing | `useState` en `tweaks.view` | React Router v6 |
| Estado global | `React.useContext` + `useState` | Zustand con `persist` |
| LLM call | `window.claude.complete` (demo) | `fetch` autenticado a `/conversaciones/{id}/mensajes` |
| Tweaks panel | Deshabilitado · navegación por hash de URL | No existe en producción |
| Fuentes | Google Fonts CDN | Fuentes empaquetadas en Docker (offline) |
| Empaquetado | Archivos JSX sueltos | Docker multi-stage: node build + nginx:alpine |

---

## 8. Decisiones que faltan tomar antes del refactoring

Al pasar a producción, hay que resolver qué backend usar:

### Opción A · Backend simple (`LLM_usuario.md`)

- **Pro**: ya implementado, FastAPI + SQLite + Qdrant + Gemini, demo funcional
- **Contra**: no soporta multi-tenant, JWT, módulos separados, KPIs streaming SSE, audit log persistente, doble custodia, ni capacidades configurables runtime
- **Cambios en el prototipo**: eliminar módulos separados, hacer todo dentro de `/consulta`, descartar la banda de KPIs streaming (los KPIs serían artefactos puntuales del LLM)

### Opción B · Backend modular (`customer_ui_spec.md`)

- **Pro**: soporta toda la complejidad descrita, multi-tenant, audit, módulos opcionales por Docker, capacidades runtime
- **Contra**: requiere construir 4 Dockers separados (central, KPIs streaming, Reportes, Acciones), JWT + JWKS + IdP, observabilidad, etc.
- **Cambios en el prototipo**: solo reemplazar mocks por llamadas reales, la arquitectura visual está lista

### Opción C · Híbrido

- UI con la arquitectura del prototipo (modular, capability-driven) pero backend `LLM_usuario.md` ampliado:
  - Mantener `/consulta` como llamada principal del LLM
  - Agregar `/capabilities` que devuelva `modulos` con flags
  - Agregar `/kpis/stream` para SSE
  - Agregar `/accion` con audit log persistente + aprobación
  - Agregar `/reportes` con catálogo y formatos por cliente
- Backend monolítico (no Docker por módulo) pero contratos claros

---

## 9. Pregunta para Claude Code

Dado el prototipo actual (en este proyecto Omelette) y los dos specs de referencia, **¿cuál es la ruta de refactoring más eficiente para llegar a producción?**

Necesitamos saber:

1. ¿Cuánto del JSX actual es portable a TypeScript + Vite + shadcn/ui directamente?
2. ¿Qué componentes hay que rehacer desde cero (charts, tablas, dropdowns)?
3. ¿Qué efecto tiene elegir Opción A / B / C sobre el alcance del frontend?
4. ¿Se justifica un monorepo con paquete de design system extraído?
5. ¿Qué endpoints adicionales habría que crear en el backend `LLM_usuario.md` para soportar la maqueta tal cual?
6. ¿Tiempo estimado de refactoring por opción?

---

**Fin del documento.**

Adjuntos relevantes para la conversación con Claude Code:
- `uploads/customer_ui_spec.md` — spec del producto modular
- `uploads/LLM_usuario.md` — spec del backend RAG actual
- Este documento — estado actual del prototipo
- El código del prototipo: `index.html` + archivos `.jsx` en el raíz del proyecto
