# Respuestas a ambigüedades · v2.0 → Claude Code

> Decisiones tomadas por el equipo de diseño sobre el documento
> `ambiguedades.md`. Cada respuesta incluye **opción elegida + razón**
> derivada de las conversaciones de diseño.
>
> **Fecha**: 2026-05-14
> **Estado**: aprobado para arrancar implementación.

---

## Q1 · Temática vs Conversación

**Decisión: A · Temática = conversación 1:1**

**Razón**: el contrato HTTP actual (`GET /conversaciones/{id}`) ya trata
cada conversación como atómica. Lo que aparecía en el prototipo como
"Análisis inicial / Seguimiento / Cierre" era solo placeholder visual
de demo, no un modelo real.

**Cómo se materializa en la UI**:
- Cada conversación creada en el chat → una entrada en el sidebar.
- La entrada se ubica bajo `{ámbito · semana}` calculados al momento
  de crear la conversación.
- El "título" de la temática se deriva del primer mensaje del usuario
  (truncado a ~56 caracteres) y se puede sobreescribir si el backend
  emite un título mejor (`flag autorenombrar_ambito_al_primer_mensaje`).
- Click en una temática → carga el thread completo con
  `GET /conversaciones/{id}`.

**Implicación**: el campo `Conversacion.tematica_id` **no se introduce**.
Si en el futuro hace falta agrupar conversaciones, se diseñará sin
breaking change.

---

## Q2 · `detectAmbito` cliente vs servidor

**Decisión: A · UI implementa fallback con regex local, prefiere `ambito_id` del backend**

**Razón** (sobreescribe la recomendación original B): durante la
implementación del prototipo confirmamos que el ámbito viene en el JWT
del usuario (campo `ambitos_autorizados`) y el backend lo asocia a cada
conversación. **Pero hasta que el central V2 emita `metadata.ambito_id`,
la UI necesita poder clasificar conversaciones para que el sidebar no
quede vacío en demos.**

**Cómo se materializa en la UI**:
- Si la respuesta del backend incluye `metadata.ambito_id` → se usa
  directamente.
- Si no llega → `detectAmbito(texto)` aplica un regex client-side
  usando el vocabulario de cada ámbito autorizado (configurable por
  tenant en `capabilities.ambitos_autorizados[].vocabulario[]`).
- Si ningún regex matchea → cae al primer ámbito autorizado del usuario.

**No usar la opción B** ("Sin clasificar"): el equipo prefiere
clasificación tentativa antes que mostrar un grupo no clasificado, que
genera ruido visual.

**Cuándo se elimina el fallback**: cuando el central V2 incorpore el
campo `metadata.ambito_id` (Sprint 6 del backend). La función
`detectAmbito` se mantiene como utility por compatibilidad con
conversaciones legacy.

---

## Q3 · KpiBand vs Dashboard `/dashboard`

**Decisión: A · Comparten store y SSE**

**Razón**: el usuario eliminó `/dashboard` como ruta separada y mantiene
`/on-line` como la vista del módulo KPIs en el cluster de navegación.
La KpiBand inline es un atajo desde el chat al mismo store.

**Cómo se materializa en la UI**:
- Store: `useKpis()` (Zustand) con datos SSE.
- KpiBand (sobre el chat) usa `useKpis().kpis_usuario` filtrados a los 5
  configurados.
- Vista `/on-line` usa `useKpis().kpis_completos` con histórico.
- Solo una conexión SSE activa por sesión.

**Importante**: la KpiBand inicia colapsada. El usuario la abre con el
botón "KPI" del TopBar (toggle on/off).

---

## Q4 · Compatibilidad de artefactos `accion_propuesta` v1

**Decisión: A · Ignorar silenciosamente `riesgo` y `requiere_confirmacion`**

**Razón**: el usuario eliminó el badge de riesgo de la UI ("cada usuario
decide la fricción de su acción"). Los campos legacy pueden venir en
mensajes históricos pero no afectan el render.

**Cómo se materializa en la UI**:
- Schema Zod usa `.passthrough()` a nivel del artefacto.
- El componente `AccionPropuestaCard` v2 ignora `riesgo` y
  `requiere_confirmacion` si están presentes.
- No se muestra `<RiesgoBadge>` en ninguna parte.

---

## Q5 · Artefacto inline vs vista `/acciones`

**Decisión: A · Stub que navega a `/acciones`**

**Razón**: el usuario aclaró que el chat solo emite un "stub" cuando el
LLM propone una acción. La revisión, edición y ejecución suceden en la
vista `/acciones`.

**Cómo se materializa en la UI**:
- En el chat: aparece una tarjeta pequeña con ícono (mail o robot),
  título de la acción y botón **"Revisar en panel"**.
- Click → navega a `/acciones` y selecciona la acción recién creada.
- La acción se persiste en el módulo de Acciones con estado `pendiente`.
- Toda confirmación/edición/audit log vive en la vista.

**Nota adicional**: las acciones manuales (botón "+ Nueva" en `/acciones`)
no pasan por el chat. El stub del chat es solo para acciones generadas
por el LLM.

---

## Q6 · `asistente_activo` (singular) vs `ui.asistentes[]` (lista)

**Decisión: B · Único activo, cambiable via TopBar**

**Razón**: el usuario confirmó en una conversación previa: *"en el
sidebar, lo que ves como 'engorda', 'planta', etc. son otros
asistentes. Cada uno debiera tener una interfaz igual a la que muestras.
Sucede que coloque todos en el mismo para mostrar a un cliente."*

El usuario opera con un asistente a la vez, pero **puede cambiar entre
los autorizados sin re-loguearse**.

**Cómo se materializa en la UI**:
- `capabilities.ui.asistentes[]` lista todos los asistentes autorizados
  para el rol del usuario.
- `capabilities.asistente_activo` indica cuál es el activo en esta
  sesión.
- `AsistenteBadge` en TopBar es un **dropdown** que lista los otros
  asistentes autorizados.
- Al cambiar de asistente: refetch de `/capabilities`, persiste en
  `localStorage` + `PATCH /usuario/preferencias { asistente_activo_id }`.
- Las conversaciones del sidebar se filtran por `asistente_activo`:
  cada conversación lleva `asistente_id` y solo se muestran las del
  asistente actualmente activo.

---

## Q7 · Endpoints `/pendientes` y `/notificaciones`

**Decisión: B · Computados cliente-side**

**Razón**: evitar endpoints nuevos en el central V2. Los pendientes son
derivables de la información que la UI ya tiene.

**Cómo se materializa en la UI**:
- **Pendientes** = `useAcciones().acciones.filter(a => a.estado === 'pendiente')`
  + KPIs sobre umbral (del SSE) + mensajes no leídos.
- **Notificaciones** = transientes basadas en eventos del cliente
  (acción ejecutada, KPI cruzó umbral, etc.). Se acumulan en Zustand
  con TTL. No persisten al refresh.

**Excepción**: si en el futuro hay notificaciones server-push
importantes (ej. acciones bloqueadas por compliance), se introduce
`GET /notificaciones` como endpoint separado sin tocar este flujo.

---

## Q8 · Dark mode

**Decisión: A · Solo light**

**Razón**: la paleta v2 (paper, cream, navy, coral) está diseñada con
jerarquía visual específica que no se traduce directamente a dark. El
diseño no validó dark mode.

**Cómo se materializa en la UI**:
- Eliminar el media query `prefers-color-scheme: dark`.
- Las CSS vars de Tailwind se setean fijas en `:root` desde
  `capabilities.ui.colores`.
- Si un tenant en el futuro pide dark, se hace un PR separado con
  rediseño explícito.

---

## Q9 · Fuentes — variants

**Decisión: C · Variable fonts**

**Razón**: mejor relación peso/flexibilidad. Compatible con todos los
browsers que soporta la SPA (target ES2022). Permite usar pesos
intermedios sin sumar archivos.

**Cómo se materializa en la UI**:
- Fraunces: `Fraunces-VariableFont_SOFT,WONK,opsz,wght.woff2` (~50 KB).
- Plus Jakarta Sans: `PlusJakartaSans-VariableFont_wght.woff2` (~25 KB).
- JetBrains Mono: `JetBrainsMono-VariableFont_wght.woff2` (~25 KB).
- Bundleadas en `public/fonts/` con `@font-face` declarations apuntando
  a paths locales (no Google Fonts CDN).
- `font-display: swap` para evitar FOIT.

**Total estimado**: ~100 KB de fuentes en la imagen Docker (vs ~280 KB
con variants completos estáticos).

---

## Q10 · Reportes — formatos por tenant

**Decisión: B · Cada reporte declara sus formatos**

**Razón**: cada reporte sabe qué formatos puede generar (depende de la
fuente de datos, no solo del tenant). La UI no impone enum global.

**Cómo se materializa en la UI**:
- Schema:
  ```ts
  Reporte = {
    id: string;
    titulo: string;
    gerencia: string;
    formatos: string[]; // ['xlsx', 'pdf', 'pptx', 'pbi']
    habilitado_para_usuario: boolean;
    duenio: string;
    version_actual: string;
    tipo: 'operativo' | 'gerencial';
  }
  ```
- La UI renderiza solo los botones de formato que el reporte declara.
- Si un tenant no tiene la herramienta corporativa (ej. no usa PowerPoint),
  el catálogo del backend ya filtra esos formatos antes de devolverlo.
- **Eliminar** la mención de "proveedor de nube" en la UI (Azure, AWS,
  GCP). Los formatos son agnósticos al proveedor.

---

## Q11 · Política de salida de datos (regla firme inmutable)

**Decisión: El módulo Reportes es el único canal de salida de datos
del Asistente al PC del usuario o a cualquier destino externo.**

**Razón**: política de seguridad de la organización. Los datos del
datamart son sensibles; cualquier fuga es altamente perjudicial. La
única forma controlada de exportar información es por reportes
preacordados con RBAC y audit log.

**Cómo se materializa en la UI**:

| Módulo / acción | ¿Puede sacar datos al PC o correo? |
|---|---|
| Reportes — catálogo preacordado, RBAC, formatos controlados | ✅ Único canal autorizado |
| Chat — embebidos, gráficos, tablas, predicciones, KPIs | ❌ Solo visualización |
| Acciones · `ENVIAR_CORREO` | ❌ Sin adjuntos. Solo texto comunicacional |
| Acciones · `AGENTE_IA` | ❌ Ejecuta sin transferir datos al usuario |
| on-line / KPIs streaming | ❌ Solo visualización en pantalla |
| Audit log | ❌ Consultable por auditor, no descargable por usuario |
| Conversaciones | ❌ No exportables, solo visualización en thread |

**Reportes** se entienden como:
- **Preacordados**: definidos por el cliente. No hay reportes ad-hoc
  generados al vuelo.
- **Compartidos**: el reporte es accesible para todos los usuarios
  autorizados por RBAC. No se baja "por persona" sino que se accede al
  reporte compartido.
- **Auditados**: cada descarga queda registrada con HMAC chain
  (`POST /audit/event`).
- **Visibles antes de bajar**: el preview lateral muestra los datos en
  pantalla sin necesidad de descargar el archivo.

**Cambios concretos en el contrato HTTP**:

1. **Eliminar** el artefacto `archivo_descargable` del catálogo de
   artefactos del LLM. Si llegase a llegar por compatibilidad, el
   dispatcher de la UI lo trata como `UnknownArtifactPlaceholder`.
2. **Eliminar** los stubs de descarga inline en mensajes del chat.
3. **Rechazar** adjuntos en `POST /accion`: el backend devuelve
   `VALIDATION_ERROR` si `tipo_accion === "ENVIAR_CORREO"` trae
   `adjuntos[]` no vacío.
4. **Descargas de Reportes** pasan por
   `GET /reportes/{id}/download?formato={xlsx|pdf|pptx|pbi}` con audit
   log obligatorio y validación RBAC.
5. **No introducir** endpoints de exportación en otros módulos
   (`/conversaciones/{id}/export`, `/kpis/export`, etc.).

**Cambios concretos en la UI**:

1. **Chat**: eliminar botón "Descargar" del stub de reporte. Botón
   único "Abrir en Reportes" que navega a la vista del módulo.
2. **Panel preview lateral**: sección "Descargar como" con los 4
   botones (Excel, PDF, PowerPoint, Power BI) **solo se renderiza
   dentro de la vista del módulo Reportes**. No en el preview que se
   abre desde el chat.
3. **Catálogo de Reportes**: botón "Generar" (que abre el panel con
   las opciones de descarga). El único lugar donde existen los botones
   de descarga.
4. **Acciones · correo**: campo "Adjuntos" deshabilitado con banner:
   "Adjuntos deshabilitados. Si necesitas compartir datos, hazlo a
   través del módulo Reportes."
5. **Watermark dinámico** con `usuario.id_pseudo + timestamp` en cada
   vista de datos sensibles, como elemento de disuasión + trazabilidad.

**Medidas técnicas que acompañan**:

- **CSP estricta**: `connect-src 'self'`. Bloqueo de URLs `blob:` y
  `data:` excepto en el flujo de descarga oficial de Reportes.
- **Audit log con HMAC chain**: cada apertura de preview, navegación a
  reporte, descarga de reporte y consulta al chat queda registrada
  (D2 + HU6.3 del repo `diseno`). Retención por rol (5 años para
  auditor según política).
- **Watermark sutil** en vistas de datos sensibles con identificador
  del usuario (sin texto invasivo, opacidad ~5%).

**Limitación honesta documentada**:

Ningún producto web puede impedir 100% la fuga de datos —siempre
existe la captura de pantalla con dispositivo externo (celular). Esta
política eleva la fricción al punto de requerir esfuerzo deliberado,
y el audit log permite trazar quién accedió a qué dato y cuándo.

**Cuándo NO aplicar esta política**: nunca. Es regla firme inmutable
del producto. Si un cliente solicita "permitir descarga desde el chat",
se le explica que existe el módulo Reportes para ese caso de uso. La
configuración del módulo permite definir reportes ad-hoc del cliente
(por dueño y permisos), no abrir la UI a descargas libres.

---

## Sumario de decisiones

| Q | Tema | Decisión |
|---|---|---|
| Q1 | Temática vs Conversación | **A** · 1:1 |
| Q2 | detectAmbito | **A** · Fallback regex (sobreescribe B original) |
| Q3 | KpiBand vs Dashboard | **A** · Comparten store y SSE |
| Q4 | Compatibilidad accion_propuesta v1 | **A** · Ignorar campos legacy |
| Q5 | Artefacto inline vs vista | **A** · Stub que navega |
| Q6 | asistente_activo | **B** · Único activo, cambiable |
| Q7 | /pendientes y /notificaciones | **B** · Computados cliente |
| Q8 | Dark mode | **A** · Solo light |
| Q9 | Fuentes variants | **C** · Variable fonts |
| Q10 | Formatos de reportes | **B** · Por reporte |
| Q11 | Política de salida de datos | **Reportes = único canal** (regla firme inmutable) |

---

## Próximos pasos

1. Claude Code puede arrancar **todos los PRs** del handoff v2.0 con
   estas respuestas.
2. **PR 4 (Sidebar)** y **PR 8 (Acciones)** ya tienen lo que necesitan
   (Q1, Q2, Q4, Q5, Q6 resueltas).
3. Si durante implementación surge ambigüedad nueva, documentar acá y
   pingar al equipo de diseño.

---

**Fin del documento.**
