# Handoff a Claude Code · Frontend del Asistente Virtual

> **Versión**: 2.0 (consolidada) · 2026-05-14
> **Prototipo de referencia**: este proyecto Omelette.
> **Repo destino**: `Asistente-agentico/producto-customer-ui@main`.
> **Backend**: `Asistente-agentico/diseno@main` (Sprint 1 cerrado).

Este documento mapea **sección por sección** el `docs/spec.md` y el
`docs/handoff-design.md` del repo `producto-customer-ui` contra las
decisiones que tomamos en este prototipo, de modo que Claude Code sepa
exactamente qué tocar, qué preservar, y dónde diverge nuestra visión del
spec original.

---

## 1. Resumen ejecutivo

El repo `producto-customer-ui` ya tiene 12 hitos (H0–H12) cerrados, 48
tests pasando, CI verde, imagen Docker ~20 MB. Las 10 ambigüedades A1–A10
están resueltas. **Lo que falta** es aplicar el Look & Feel + flujos UX
que diseñamos. La línea segura: tocar la capa visual sin tocar el cliente
HTTP, los Zod schemas, el dispatcher, los stores, ni los tests de tipo.

---

## 2. Mapeo sección por sección del `docs/spec.md` del repo

### §1 Arquitectura · 5 módulos
**Spec dice**: UI capability-driven que descubre módulos vía `/capabilities`.
**Nuestra decisión**: idéntico. **No cambia.**

### §2 Stack
**Spec dice**: React + TS + Vite + Tailwind + shadcn + Zustand + TanStack
Query/Table + Recharts + RHF + Zod + react-i18next + MSW + Sentry-compat +
OpenTelemetry browser.
**Nuestra decisión**: mantener. **No cambia.**

### §3 Tenancy + Docker
**Spec dice**: imagen multi-stage, entrypoint materializa env vars en
`config.js`.
**Nuestra decisión**: idéntico. **No cambia.**

### §4 Contrato HTTP
**Spec dice**: 7 grupos de endpoints + headers transversales + formato
uniforme de error.
**Nuestras decisiones que afectan el contrato**:

| Cambio | Detalle |
|---|---|
| `/capabilities.usuario.email_institucional` | **NUEVO** campo. Viene del IdP (claim `email` del JWT). Usado como remitente en módulo Acciones. |
| `/capabilities.usuario.idioma` | **NUEVO** campo. Preferencia del usuario server-side. Aplica al switcher y al idioma de correos. |
| `/capabilities.ambitos_autorizados[]` | **NUEVO** campo. Lista de ámbitos a los que el usuario tiene acceso (filtrado por rol + gerencia). |
| `/conversaciones` con metadata | Cada conversación debe traer `ambito_id` y `created_at` para que el frontend pueda agrupar en sidebar por ámbito + semana. |
| `/acciones` simplificado | Eliminar `/solicitar-aprobacion` y `/aprobar`. Las acciones no requieren aprobación. Solo `POST /acciones`, `PATCH /acciones/{id}`, `POST /acciones/{id}/ejecutar`, `POST /acciones/{id}/descartar`. |

### §5 Configuración 3 capas
**Spec dice**: Capa 1 defaults, Capa 2 env vars, Capa 3 `/capabilities`.
**Nuestra decisión**: idéntico. **No cambia.**

### §6 Catálogo de artefactos
**Spec dice**: 11 artefactos tipados + `UnknownArtifactPlaceholder`.
**Nuestras decisiones que afectan artefactos**:

| Artefacto | Cambio |
|---|---|
| `accion_propuesta` | Eliminar campo `riesgo` (bajo/medio/alto). Cada usuario decide la fricción. |
| `accion_propuesta` | Eliminar campos `requiere_confirmacion` y niveles de fricción. Solo dos tipos: `ENVIAR_CORREO` y `AGENTE_IA`. |
| `accion_propuesta` | Si `tipo_accion === 'AGENTE_IA'`: incluir `permiso_requerido` para que la UI valide RBAC visual. |
| (resto) | **Sin cambios.** |

### §7 Auth + RBAC
**Spec dice**: `iam_interno` + `idp_externo` (OIDC), pre-checks léxicos.
**Nuestra decisión**: idéntico. **No cambia.**

### §8 Comunicación módulos
**Spec dice**: UI habla directo con cada módulo; URLs vienen de capabilities.
**Nuestra decisión**: idéntico. **No cambia.**

### §9 Estado de sesión
**Spec dice**: Zustand in-memory + localStorage + cookies HttpOnly.
**Nuestra decisión**: idéntico. **No cambia.**

### §10 i18n
**Spec dice**: es/en/pt bundleados, cascada de detección, switcher.
**Nuestras precisiones**:
- **Idioma de correos del módulo Acciones**: idioma del **usuario disparador**,
  no del destinatario. Mostrar indicador "🌐 idioma del correo · español"
  bajo el cuerpo del composer.

### §11 Mobile
**Spec dice**: mobile-first, sidebar colapsable, touch targets ≥44px.
**Nuestra decisión**: idéntico. **No cambia.**

### §12 Observabilidad
**Spec dice**: errores, métricas, audit con toggle global.
**Nuestra decisión**: idéntico. **No cambia.**

### §13 Versionado
**Spec dice**: 4 niveles, banner de nueva versión, `X-Latest-Client-Version`.
**Nuestra decisión**: idéntico. **No cambia.**

### §14 Seguridad
**Spec dice**: CSP estricta, security headers, sanitización markdown.
**Nuestra decisión**: idéntico. **No cambia.**

### §15 A11y
**Spec dice**: WCAG 2.1 AA, foco visible, ARIA, prefers-reduced-motion.
**Nuestra decisión**: idéntico. **No cambia.**

### §16 Estructura del repo
**Spec dice**: organización por `api/`, `app/`, `artifacts/`, `features/`,
`stores/`, etc.
**Nuestra decisión**: idéntico. **No cambia.**

### §17 Build y despliegue
**Spec dice**: Dockerfile multi-stage, ~20 MB, healthcheck.
**Nuestra decisión**: idéntico. **No cambia.**

### §18 Lifecycle de bootstrap
**Spec dice**: 7 pasos del bootstrap.
**Nuestra precisión**:
- El **bootstrap splash** debe ser visual con 7 checkmarks secuenciales
  reflejando lo que se está cargando. Auto-avanza al chat al completarse.

### §19 Eventos y handlers
**Spec dice**: lista de triggers principales.
**Nuestras decisiones**:
- **Botones de cabecera (Última, Pendientes, KPI) son toggle on/off puros**.
  Click otra vez los cierra. Solo `Esc` también los cierra (Pendientes
  permite click-outside porque es dropdown).

---

## 3. Reglas firmes UX del prototipo (visibilidad y comportamiento)

### 3.1 Pantalla arranca limpia
- Login → Bootstrap → Chat con thread vacío.
- Sin data stale.
- Sidebar de ámbitos arranca con todos los paneles colapsados.
- TopBar con toggles en OFF.
- KPI band oculta por defecto.

### 3.2 TopBar
- Una sola fila, altura 48px (`h-12`).
- Sin franja de fecha redundante. La fecha es texto plano sobre paper.
- Todos los elementos a 32px (`h-8`).
- Cluster de módulos: **Chat · ML · Reportes · Acciones · on-line**
  ("on-line" = link al módulo KPIs).
- "KPIs" **no aparece** en el cluster — su slot es el botón KPI + la banda.

### 3.3 Sidebar
- **Solo en Chat**. No aparece en Reportes, Acciones, on-line, ML.
- 288px navy `#0A2540` con texto blanco.
- Marca arriba: "Tu Asistente Asistente Virtual" + "tu apoyo operativo".
- Ámbitos colapsados inicialmente.
- Cada ámbito → semanas (últimas 4) → temáticas → conversaciones.
- Footer del sidebar: nombre + rol + gerencia del usuario.

### 3.4 Auto-registro de conversaciones
**Crítico**. Cada conversación nueva del chat se registra automáticamente
en el sidebar:
- **Ámbito**: detectado del texto del primer mensaje. En producción lo
  detecta el backend y lo devuelve en `metadata.ambito_id`.
- **Semana**: calculada desde `created_at` con etiquetas relativas:
  *Esta semana* / *Semana pasada* / *Hace N semanas*. Solo 4 últimas.
- **Persistencia**: server-side. La UI agrupa en cliente.
- **Reanudación**: click en una temática → `GET /conversaciones/{id}` →
  carga el thread.

### 3.5 KPI band
- Fondo `#FFFCF5`, diferenciable del paper.
- 5 KPIs como números grandes coloreados por severidad (verde/amarillo/rojo).
- Click expande detalle inline con gráfico (line/bar/gauge/progress).
- Múltiples expandibles simultáneamente.

### 3.6 Reportes
- Sin sidebar.
- Título dinámico: `"Reportes Gerencia ${usuario.gerencia}"`.
- Subtítulo: "Catálogo de reportes pre acordados".
- Filtros: Todos · Habilitados · No habilitados.
- Cada tarjeta: ID · tipo · nombre · descripción · formatos · dueño · versión.
- No habilitados se muestran atenuados con candado.
- **Sin reportes ad-hoc.**
- **Sin proveedor de nube visible.**

### 3.7 Acciones
- Sin sidebar.
- Subtítulo: "Seguimiento de acciones".
- Cola lateral con resumen.
- **Fondo principal arranca limpio** con hint para seleccionar.
- Dos tipos: `ENVIAR_CORREO` y `AGENTE_IA`.
- **Sin doble custodia. Sin aprobación de tercero.**
- Estados: `pendiente` → `ejecutada` / `rechazada`.
- Botón "+ Nueva" abre panel lateral con 2 pestañas:
  - **Correo institucional**: De (read-only del JWT), Para, Asunto, Cuerpo
    (composer con toolbar: despedida, ref. adjuntos, tonos). Indicador de
    idioma debajo.
  - **Agente**: catálogo filtrado por permisos. Habilitados/No habilitados.
- Audit log con timeline. Último evento con dot coral. Retención 5 años.

### 3.8 Mensajes del chat
- Cada mensaje (usuario y asistente) tiene botón individual de
  **colapsar / expandir**.
- Cuando se colapsa: preview de 2 líneas + contador de artefactos ocultos.
- Sin banner "modo: conversación" ni indicadores técnicos en la esquina
  superior izquierda.

### 3.9 Footer
- "Powered by OPCiber · © 2026 · Todos los derechos reservados" en todas
  las páginas incluyendo Login y Bootstrap.

### 3.10 Composer
- Sin scope chips ("asistente engorda · CTR-007 · jaula 4" se eliminaron).
- Solo textarea + toolbar (Adjuntar, Voz, Plantillas) + botón Enviar.
- Status "generando…" arriba a la derecha durante stream.

---

## 4. Paleta y tipografías (deltas vs spec del repo)

El repo tiene paleta y tipografías como **CSS vars desde `/capabilities`**.
Nuestra paleta es:

```css
--navy:        #0A2540;   /* sidebar */
--coral:       #E85C3C;   /* acento, CTAs */
--paper:       #FAFAF7;   /* fondo principal */
--cream:       #F2EEDF;   /* texto sobre navy */
--rule:        #EDEAE0;   /* borders */
--ink:         #0A0A0A;   /* texto primario */
--ink2:        #5C5C5C;   /* secundario */
--ink3:        #9A958B;   /* terciario */
--ok:          #2D7D6F;
--warn:        #B8860B;
--cream-band:  #FFFCF5;   /* fondo KPI band */
```

**Tipografías** (las 3 bundleadas offline, no CDN):
- Display / títulos: **Fraunces** (optical-sizing)
- Texto / UI: **Plus Jakarta Sans**
- Datos / IDs / timestamps: **JetBrains Mono**

---

## 5. Lo que NO se debe tocar

Documentado en `docs/handoff-design.md §5.5` del repo:

1. **Discriminated unions con `tipo` literal** en `src/api/types.ts`.
2. **`passthrough()` solo a nivel hijo, no root** en schemas Zod.
3. **CSS vars desde `/capabilities`** (no migrar a Tailwind theme custom).
4. **Lazy load por artefacto** con `React.lazy` + `Suspense`.
5. **El contrato HTTP** completo en `src/api/types.ts` (salvo los campos
   nuevos listados en §2).
6. **El cliente con interceptor refresh 401** en `src/api/client.ts`.
7. **Los 48 tests existentes** — actualizar junto con los cambios de
   markup; no eliminar.

---

## 6. Plan de PRs

Cada PR pasa `typecheck + lint + test + build + Trivy` antes de merge.

| # | PR | Toca | Riesgo |
|---|---|---|---|
| 1 | Tailwind config + fuentes bundleadas | `tailwind.config.ts`, `src/fonts/` | bajo |
| 2 | AppLayout + Footer | `src/app/AppLayout.tsx`, nuevo `Footer.tsx` | bajo |
| 3 | TopBar con toggles on/off + cluster de módulos | `src/app/TopBar.tsx` | medio |
| 4 | Sidebar con ámbitos + auto-registro de conversaciones | `src/app/Sidebar.tsx`, `src/stores/conversaciones.ts` | medio |
| 5 | KpiBand colapsable | nuevo `src/features/kpis/KpiBand.tsx` | bajo |
| 6 | Chat: mensajes colapsables, sin scope chips | `src/features/chat/` | medio |
| 7 | Reportes gerencia-aware + filtros | `src/features/reportes/` | bajo |
| 8 | Acciones: cola limpia + "+ Nueva" + composer rico + permisos | `src/features/acciones/` + Zod schema | alto |
| 9 | Login con módulos contratados + Bootstrap splash | `src/features/auth/`, nuevo `src/features/bootstrap/` | bajo |
| 10 | Mobile responsive + drawer | varios | medio |
| 11 | Cleanup tests + axe-core final | `src/test/`, varios | bajo |

**Total estimado**: 2 a 3 semanas para un dev full-time.

---

## 7. Cambios al backend requeridos (Central V2)

Para que esta UI funcione contra backend real:

1. **`/capabilities.usuario.email_institucional`** — viene del JWT.
2. **`/capabilities.usuario.idioma`** — preferencia server-side.
3. **`/capabilities.ambitos_autorizados[]`** — filtrado por rol + gerencia.
4. **`/conversaciones` con metadata**: cada conversación trae `ambito_id`
   y `created_at`.
5. **`/conversaciones/{id}/mensajes`**: response incluye `metadata.ambito_id`
   para que la UI registre la conversación bajo el ámbito correcto.
6. **`/acciones` simplificado** (sin aprobación):
   - `POST /acciones` — crear borrador
   - `GET /acciones` — cola del usuario
   - `GET /acciones/{id}` — detalle con audit log
   - `PATCH /acciones/{id}` — editar parámetros (solo si `pendiente`)
   - `POST /acciones/{id}/ejecutar` — disparar
   - `POST /acciones/{id}/descartar`
7. **Validaciones servidor en `/acciones/{id}/ejecutar`**:
   - Si `ENVIAR_CORREO`: validar que `from` coincide con `email_institucional`
     del JWT. Rechazar 403 si no.
   - Si `AGENTE_IA`: validar `permiso_requerido` ∈ `permisos[]` del JWT.
8. **Eliminar del contrato V1**: `riesgo` del schema `accion_propuesta`,
   endpoints `/solicitar-aprobacion`, `/aprobar`, niveles de fricción.

---

## 8. Apéndices

### A · Archivos del prototipo Omelette como referencia

| Archivo | Aporta |
|---|---|
| `index.html` | Shell HTML + carga de scripts + paleta + tipografías |
| `state.jsx` | Mock capabilities + ámbitos + KPIs + `registerConversation()` + `semanaRelativa()` |
| `conversation.jsx` | Thread del chat con auto-registro de conversación en sidebar |
| `topbar.jsx` | Cabecera con toggles, módulos, bell, asistente |
| `sidebar.jsx` | Ámbitos + temáticas por semana + usuario al pie |
| `kpi-band.jsx` | Banda colapsable con 4 tipos de chart |
| `chat.jsx` | Thread + mensajes colapsables + empty hint |
| `composer.jsx` | Textarea + tools (sin scope chips) |
| `embeds.jsx` | Artefactos inline (LineChart, CausalAlert, PredictionChart, stubs) |
| `view-actions.jsx` | Cola + detalle + audit + permisos + composer rico + "+ Nueva" |
| `view-reports.jsx` | Catálogo gerencia-aware + filtros |
| `view-kpis-and-auth.jsx` | Login + Bootstrap + on-line KPIs |
| `panels.jsx` | Paneles laterales (Report Preview + Permisos) |
| `Overview.html` | Vista panorámica de las 14 pantallas |

### B · Decisiones del backend del repo `diseno` que aplican

| ID | Decisión | Aplica a frontend |
|---|---|---|
| Restricción 1.6 / 2.6 | Español neutro obligatorio | Todos los strings de UI |
| Restricción 2.9 | Salmonera = ejemplo, no canon | Código agnóstico |
| D2 | RBAC default · PII por etiquetas | Panel "¿Qué estoy viendo?" |
| D6 | Single-tenant · multi-tenant ready | `tenant_id` del JWT |
| D11 | GitOps en UI de configuración | No aplica a esta UI |
| D13 | Data Vault · `temporal_policy` | UI muestra histórico solo si `temporal_policy ≠ vigente` |
| D15 | Sprint 7 = licenciamiento | UI muestra modo de gracia |
| ADR-002 | Streaming = post-v1.0 | KPIs son batch en v1 |
| ADR-004 | Sin perfil offline en v1 | — |

### C · Notificaciones y pendientes (mock que se mantiene)

`PENDIENTES_DATA` y `NOTIFICATIONS` en `topbar.jsx` están actualizadas
al flujo sin aprobación:

```js
const PENDIENTES_DATA = [
  { tipo: 'borrador',   sev: 'warn', titulo: 'Correo pendiente · Hugo', mod: 'acciones' },
  { tipo: 'umbral',     sev: 'warn', titulo: 'O₂ disuelto bajo umbral', mod: 'kpis' },
  { tipo: 'mortalidad', sev: 'warn', titulo: 'CTR-007 sobre umbral',    mod: 'central' },
];
```

En producción → `GET /pendientes` o se computan en frontend.

---

## 9. Glosario

| Término | Significado |
|---|---|
| **Ámbito** | Sub-dominio funcional. `mortalidad`, `calidad_agua`, etc. |
| **Temática** | Agrupación de conversaciones de un tema dentro de un ámbito. |
| **Capabilities** | Configuración runtime del despliegue. |
| **Artefacto** | Estructura tipada que el LLM emite. 11 tipos. |
| **Módulo opcional** | Pieza licenciable. KPIs, ML, Reportes, Acciones. |
| **Audit log** | Trazabilidad de acciones con retención por rol. |
| **PII** | Datos personales enmascarados antes del LLM. |
| **Capability-driven** | UI que se adapta sin lógica condicional hardcoded. |
| **Correo institucional** | Email del usuario desde el JWT, read-only en la UI. |

---

**Fin del documento.**

Junto a este documento, Claude Code debe revisar:
1. El prototipo Omelette completo (16 archivos JSX).
2. `docs/spec.md` del repo `producto-customer-ui` (53 KB).
3. `docs/handoff-design.md` del repo `producto-customer-ui` (16 KB).
4. `CLAUDE.md` del repo `diseno`.
5. `docs/decisiones/HISTORIAS_USUARIO.md` del repo `diseno`.
