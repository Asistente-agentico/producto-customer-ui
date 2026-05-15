# Ambigüedades a resolver antes de Fase 1 (PR 1 en adelante)

> **🟢 ESTADO: RESUELTO (2026-05-14)** — las decisiones tomadas por el
> equipo de diseño están en [`ambiguedades-resueltas.md`](ambiguedades-resueltas.md).
> Este documento se mantiene como histórico de las preguntas formuladas.
>
> Además de las 10 ambigüedades originales, el equipo agregó **Q11
> (política de salida de datos)** como regla firme inmutable del
> producto. Ver el doc de respuestas.
>
> Documento dirigido al equipo de diseño (Claude Design) para resolver
> antes de empezar la implementación de los PRs del handoff v2.0.
>
> El **PR 0** (bump del schema de Capabilities) ya se puede ejecutar sin
> respuestas — es transversal y aditivo. Los demás PRs dependen de
> aclaraciones, con énfasis en **PR 4 (Sidebar)** y **PR 8 (Acciones)**.
>
> Cada ítem tiene: **contexto · pregunta · opciones · recomendación**.
> Marcar la opción elegida o agregar una alternativa. Cuando esté
> resuelto, este doc se actualiza con la decisión + razón.

---

## Q1 · Modelo "Temática vs Conversación"

**Contexto**: en `state.jsx` (mock del prototipo Omelette), una temática
puede agrupar **N conversaciones** (`t.conversaciones = 3`, al expandir
muestra "Análisis inicial / Seguimiento / Cierre"). Sin embargo, el
contrato HTTP del repo trata cada conversación como atómica
(`GET /conversaciones/{id}` retorna un thread de mensajes).

**Pregunta**: ¿"temática" es una agrupación lógica del sidebar **inferida
del cliente** sobre conversaciones individuales, o es un **nuevo concepto
del contrato** que el central V2 debe implementar?

**Opciones**:
- **A** · Temática = agrupación visual cliente. Una conversación 1:1 con una temática. Lo de "Análisis inicial / Seguimiento / Cierre" del prototipo era solo placeholder demo.
- **B** · Temática = nuevo recurso del contrato. El central V2 expone `GET /tematicas` con N conversaciones cada una. `Conversacion` gana `tematica_id`.
- **C** · Híbrido: el central no cambia, pero la UI agrupa conversaciones consecutivas del mismo ámbito en un mismo día como "temática".

**Recomendación**: **A**. Mantiene el contrato actual sin nuevos endpoints,
y el sidebar muestra una conversación por temática (más simple). Si en el
futuro hace falta agrupar, se introduce sin breaking change.

---

## Q2 · `detectAmbito` cliente vs servidor

**Contexto**: el handoff v2.0 dice "en producción el backend detecta el
ámbito y lo devuelve en `metadata.ambito_id`". El prototipo Omelette
implementa `detectAmbito(text)` con regex en cliente como fallback.

**Pregunta**: ¿la UI debe implementar `detectAmbito()` (regex client-side)
como fallback hasta que el central V2 emita `ambito_id`, o asumir que
siempre llega del backend?

**Opciones**:
- **A** · UI implementa `detectAmbito` como fallback. Si llega `ambito_id` lo usa; si no, calcula con regex local.
- **B** · UI no implementa fallback. Si no llega `ambito_id`, la conversación cae a un ámbito "Sin clasificar" (visible en sidebar).
- **C** · UI no implementa fallback. Si no llega `ambito_id`, no se registra la conversación en el sidebar de ámbitos (solo aparece en `GET /conversaciones`).

**Recomendación**: **B**. Evita lógica duplicada cliente-servidor que
puede divergir. El ámbito "Sin clasificar" es honesto sobre lo que la UI
sabe y no sabe.

---

## Q3 · KpiBand vs Dashboard `/dashboard`

**Contexto**: hoy `/dashboard` muestra KPIs SSE en vivo (`useKpiStream`).
El handoff v2.0 agrega `KpiBand` (banda inline sobre el chat con 5 KPIs
expandibles). Ambos usan el mismo módulo opcional KPIs.

**Pregunta**: ¿comparten store (`useKpis`) y fuente SSE, o son
independientes?

**Opciones**:
- **A** · Comparten store y SSE. La banda y el dashboard reflejan el mismo snapshot. Cambios en uno aparecen en el otro.
- **B** · La banda lee de `capabilities.usuario.kpis_configurados[]` (snapshot estático del bootstrap) y el dashboard usa SSE en vivo. Coexisten con datos diferentes (banda = vista resumen, dashboard = vista detalle live).
- **C** · Eliminar `/dashboard`. La banda es el único punto de KPIs. Click en un KPI abre detalle en un panel lateral.

**Recomendación**: **A**. Misma fuente, distinto layout. La KpiBand
muestra los 5 KPIs configurados del usuario; el dashboard muestra todos
+ histórico. Reuso del store `useKpis` sin duplicar lógica SSE.

---

## Q4 · Compatibilidad de artefactos `accion_propuesta` v1

**Contexto**: el handoff v2.0 dice eliminar `riesgo` y
`requiere_confirmacion` del schema `accion_propuesta`. Conversaciones
persistidas pueden tener mensajes con artefactos v1 que llevan esos
campos.

**Pregunta**: ¿cómo trata la UI v2.0 los artefactos `accion_propuesta` v1
que vienen del histórico?

**Opciones**:
- **A** · Ignorar silenciosamente `riesgo` y `requiere_confirmacion`. `passthrough()` los acepta pero el componente nuevo no los usa.
- **B** · Promover a `accion_propuesta` v2 en el campo `version: 2`. La UI hace fallback al placeholder genérico para v1.
- **C** · Migración server-side: al cargar un mensaje viejo, el central V2 lo reescribe al formato v2 antes de devolverlo.

**Recomendación**: **A**. Es el camino menos disruptivo. `passthrough()`
ya está activado y los campos extra simplemente no se renderizan. Si en
el futuro queremos renderizar histórico con su shape original,
introducimos `version: 2` y mantenemos un legacy path.

---

## Q5 · Artefacto inline vs vista `/acciones`

**Contexto**: hoy el LLM devuelve `accion_propuesta` como artefacto en
el chat, y el usuario confirma ahí mismo. El handoff v2.0 introduce
vista completa `/acciones` con cola lateral + detalle + audit log.

**Pregunta**: ¿qué hace el artefacto inline cuando llega del LLM en
el chat?

**Opciones**:
- **A** · El artefacto es un "stub" con resumen + botón "Ver detalle" que navega a `/acciones/:id`. Toda confirmación/edición ocurre en la vista.
- **B** · El artefacto permite confirmar inline (flujo actual) Y abrir detalle. Doble entrada.
- **C** · El artefacto desaparece — todo va a `/acciones` y el chat muestra solo un texto "Generé una acción, podés revisarla en Acciones".

**Recomendación**: **A**. Una sola entrada al detalle, evita
divergencia de estado entre artefacto y vista. El artefacto inline
funciona como notificación + atajo.

---

## Q6 · `asistente_activo` (singular) vs `ui.asistentes[]` (lista)

**Contexto**: el v2.0 introduce `capabilities.asistente_activo`
(singular) y mantiene `ui.asistentes[]` (lista). Hoy el sidebar lista los
asistentes filtrados por permisos.

**Pregunta**: ¿hay un único asistente activo por sesión, o el usuario
puede cambiar entre N asistentes?

**Opciones**:
- **A** · Un único asistente activo. `ui.asistentes[]` desaparece del modelo. El asistente se elige en login/bootstrap y no se cambia hasta logout.
- **B** · Un asistente activo a la vez, pero cambiable. Selector en TopBar (`AsistenteBadge` también es dropdown). Al cambiar, refetch de capabilities.
- **C** · Múltiples asistentes simultáneos. `ui.asistentes[]` se mantiene; cada conversación se asocia con un asistente específico (`asistente_id`).

**Recomendación**: **B**. Coincide con `AsistenteBadge` del prototipo y
permite que un usuario con permisos múltiples cambie de asistente sin
re-loguearse. El asistente activo se persiste en `localStorage` y se
sincroniza con preferencias server-side.

---

## Q7 · Endpoints `/pendientes` y `/notificaciones`

**Contexto**: el `PendientesBtn` y `NotificationsBell` del prototipo
usan datos mock (`PENDIENTES_DATA`, `NOTIFICATIONS`). No están en el
contrato HTTP del repo ni en el spec.

**Pregunta**: ¿de dónde vienen estos datos en producción?

**Opciones**:
- **A** · El central V2 expone `GET /pendientes` y `GET /notificaciones`. Polling cada 30s + push opcional via SSE.
- **B** · La UI los computa cliente-side: pendientes = acciones con estado `pendiente` (`GET /acciones?estado=pendiente`) + KPIs sobre umbral (del SSE) + mensajes no leídos. Notificaciones = transientes basadas en eventos del cliente.
- **C** · Híbrido: pendientes computados cliente (B); notificaciones server (A).

**Recomendación**: **B**. Evita endpoints nuevos en el central V2.
Pendientes ya son derivables de `/acciones` + KPIs + mensajes. Las
notificaciones (toasts) son transientes y no necesitan persistencia.

---

## Q8 · Dark mode

**Contexto**: el repo hoy soporta `prefers-color-scheme: dark` con
variables CSS que se invierten. La paleta del v2.0 (paper `#FAFAF7`,
cream `#F2EEDF`, navy `#0A2540`) es claramente light.

**Pregunta**: ¿el v2.0 soporta dark mode?

**Opciones**:
- **A** · Solo light. Eliminar `prefers-color-scheme: dark`. La paleta del v2 es la oficial.
- **B** · Light + dark con dos paletas. La paleta del v2 es el light; el dark se mantiene como la actual o se rediseña.
- **C** · Light + dark, pero el dark sigue las CSS vars de `capabilities.ui.colores` (el tenant decide qué colores aplican según su contexto).

**Recomendación**: **A**. La paleta v2 está diseñada con jerarquía
visual específica (paper vs cream para distinguir banda KPI, navy
exclusivo del sidebar). Soportar dark agrega complejidad sin que el
diseño lo haya validado. Si en el futuro un tenant pide dark, se hace
un PR separado.

---

## Q9 · Fuentes bundleadas — variants

**Contexto**: el v2.0 pide bundlear Fraunces + Plus Jakarta Sans +
JetBrains Mono. Cada una tiene múltiples variants (regular, medium,
semibold, bold, italic, etc.).

**Pregunta**: ¿qué variants bundleamos?

**Opciones**:
- **A** · Solo variants estáticos esenciales: Fraunces 400/600, Plus Jakarta 400/500/600, JetBrains Mono 400. ~120 KB total.
- **B** · Variants completos: 4 pesos por familia × 2 estilos (regular/italic) = 24 archivos. ~280 KB.
- **C** · Variable fonts (.woff2 variable): un solo archivo por familia que cubre todos los pesos. ~80 KB total. Soporte de browsers 95%+.

**Recomendación**: **C**. Variable fonts son la mejor relación
peso/flexibilidad. Compatible con todos los browsers que soportamos
(la SPA ya usa target `ES2022`). Permite usar cualquier peso sin sumar
peso al bundle.

---

## Q10 · Reportes — formatos por tenant

**Contexto**: el v2.0 dice "los formatos disponibles se cargan
dinámicamente según las herramientas corporativas del cliente" (XLS, PDF,
PPT, PBI). Hoy `Reporte.formato` es enum fijo (`pdf` | `excel` | `csv`).

**Pregunta**: ¿de dónde vienen los formatos disponibles para un tenant?

**Opciones**:
- **A** · `capabilities.modulos.reportes.formatos_soportados[]` declara los formatos del tenant. Cada `Reporte` lista los suyos como intersección.
- **B** · Cada `Reporte` declara `formatos[]` en `GET /reportes/catalogo`. La UI no impone enum global.
- **C** · Híbrido: catálogo declara formatos por reporte (B); capabilities expone `formatos_soportados[]` solo para preview previo a la descarga.

**Recomendación**: **B**. Cada reporte sabe qué formatos puede generar
(depende de la fuente de datos, no solo del tenant). El enum `pdf` |
`excel` | `csv` se generaliza a `string`. La UI solo renderiza los
botones de formato que el reporte declara.

---

## Sumario de recomendaciones

| Q | Tema | Recomendación |
|---|---|---|
| Q1 | Temática vs Conversación | **A** · Temática = conversación 1:1 |
| Q2 | detectAmbito | **B** · "Sin clasificar" si no llega del backend |
| Q3 | KpiBand vs Dashboard | **A** · Comparten store y SSE |
| Q4 | Compatibilidad accion_propuesta v1 | **A** · Ignorar campos legacy |
| Q5 | Artefacto inline vs vista /acciones | **A** · Stub que navega a /acciones/:id |
| Q6 | asistente_activo | **B** · Único activo, cambiable via TopBar |
| Q7 | /pendientes y /notificaciones | **B** · Computados cliente |
| Q8 | Dark mode | **A** · Solo light |
| Q9 | Fuentes variants | **C** · Variable fonts |
| Q10 | Formatos de reportes | **B** · Cada reporte declara sus formatos |

---

## Cómo responder

1. Para cada Q, marcar la opción elegida o agregar una alternativa.
2. Si se confirma la recomendación → no hace falta cambio, solo "OK".
3. Si se cambia, agregar razón breve.
4. Cuando esté completo, commitear este archivo actualizado y avisar
   al equipo de implementación para arrancar los PRs.

**Sin respuestas**, el equipo de implementación puede:
- Empezar por **PR 0** (bump del schema Capabilities — ya hecho, no
  depende de respuestas).
- Posponer **PR 4 (Sidebar)** y **PR 8 (Acciones)** hasta que Q1, Q2,
  Q4, Q5 y Q6 estén resueltas.
- Hacer **PR 1, 2, 3, 6, 7, 9, 10** que son independientes de las
  decisiones de modelo.
