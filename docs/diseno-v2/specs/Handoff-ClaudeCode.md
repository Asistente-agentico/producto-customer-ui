# Handoff a Claude Code — Frontend del Asistente Virtual

> **Documento de handoff técnico** para que Claude Code construya el frontend
> del Asistente Virtual sobre el backend del repo
> [`Asistente-agentico/diseno`](https://github.com/Asistente-agentico/diseno).
>
> **Estado del repo backend al momento del handoff**: Sprint 1 cerrado (schemas
> + linter + esqueleto de Protocols). Frontend del Asistente postergado al
> **Sprint 6** (`docs/decisiones/HISTORIAS_USUARIO.md`). UI de configuración =
> **Sprint 10** (otra UI hermana, fuera del alcance de este handoff).
>
> **Fuente del prototipo**: este proyecto Omelette. 16 archivos
> (`index.html` + JSX modulares + 3 vistas comparativas).
>
> **Referencia visual y funcional**: el prototipo es la fuente de verdad para
> Look & Feel, comportamientos, capability-driven flags, layout de cada vista,
> y reglas UX (toggles on/off, sidebar contextual al chat, KPI band, etc.).
>
> **Versión del documento**: 1.0 · 2026-05-14

---

## 1. Resumen ejecutivo

El frontend conecta a un backend **monolito modular Python 3.12 / FastAPI**
diseñado en `Asistente-agentico/diseno`. Restricciones críticas heredadas:

1. **Reutilizable por dominio** vía DomainPacks. Salmonera es solo ejemplo;
   ningún dominio es canónico (`CLAUDE.md` §3, restricción 2.9).
2. **Dockerizable, datos en ambiente del cliente** (no salen del tenancy).
3. **Cumplimiento Ley 21.719** (Chile) por diseño: PII, derecho al olvido,
   audit log con HMAC chain.
4. **GitOps**: configuración vive en YAMLs versionados en git
   (`rules/<scope>.yaml`, `models.yaml`, `intents.yaml`, `causal.yaml`,
   `embeddings.yaml`, `landing.yaml`). La UI **no** persiste en BD.
5. **Licenciamiento por módulo**: cada Docker valida licencia firmada con
   fingerprint del ambiente (ADR-003). Modo de gracia configurable.
6. **Español neutro** en todo lo expuesto al usuario y dominio.
7. **Sin streaming en v1.0** — solo batch (ADR-002). Streaming es deuda
   técnica formal post-v1.0.

El backend se construye en **10 sprints** (61 historias de usuario). El
frontend del Asistente entra en el **Sprint 6** (HU6.1 — consultas vía API
REST autenticada). Este handoff cubre exactamente esa entrega.

---

## 2. Arquitectura del producto (resumen del repo)

### 2.1 Capas (4 capas conceptuales — `docs/arquitectura/contratos.md`)

1. **Capa física**: `LakehouseAdapter` (BigQuery / Athena / Synapse /
   Databricks). Única capa que toca infra del cliente.
2. **Capa de datos auditables**: `DatamartAdapter` (raw vault Data Vault
   append-only sobre el lakehouse). Acceso restringido a auditores.
3. **Capa de exposición**: `VistaAdapter` (aplica `temporal_policy`,
   `derecho_al_olvido` y RBAC sobre el raw). El embedder y el LLM
   consumen aquí, **NUNCA el raw**.
4. **Capa de servicios externos**: `EmbeddingAdapter`, `ModeloAdapter`,
   `LLMAdapter`, `RBACAdapter`, `LicenseAdapter`.

### 2.2 Módulos opcionales del producto

| Módulo | Carpeta repo | Sprint | Estado |
|---|---|---|---|
| 1 · Consultas y respuestas | `modulo_1_consultas/` | 2–5 | Núcleo |
| 2 · Informes | `modulo_2_informes/` | 8 | Opcional |
| 3 · Acciones | `modulo_3_acciones/` | 8 | Opcional |
| 4 · KPIs | `modulo_4_kpis/` | 8 | Opcional |

**Cada módulo es licenciable por separado** (HU7.3, HU8.4). El frontend debe
adaptarse a qué módulos están activos según licencia.

### 2.3 Decisiones cerradas relevantes para frontend

| ID | Decisión | Impacto frontend |
|---|---|---|
| D2 | RBAC default; PII por etiquetas | UI muestra "PII oculta", panel "¿Qué estoy viendo?" con filtros JWT |
| D3 | Embeddings solo en cloud del cliente | UI no maneja embeddings — solo recibe respuestas |
| D5 | Monolito modular + 3 microservicios opcionales | UI habla con 1 endpoint base + opcional con SSE / batch jobs |
| D6 | Single-tenant deploy; multi-tenant-ready code | UI lee `tenant_id` de capabilities; default `"default"` |
| D11 | GitOps: UI escribe YAMLs en git, no BD | UI de configuración (Sprint 10) hace commits a git, no PUT a API |
| D13 | Data Vault append-only conceptual | UI muestra histórico solo si la regla tiene `temporal_policy: snapshot` o `append_only` |
| D14 | Lakehouse del cliente | UI no maneja almacenamiento — el cliente provee landing |
| D15 | Sprint 7 dedicado a licenciamiento | UI muestra estado de licencia, modo de gracia, módulos autorizados |

### 2.4 Stack tecnológico (cerrado en Sprint 1)

| Capa | Tecnología |
|---|---|
| Lenguaje backend | Python 3.12 |
| API backend | FastAPI |
| Validación | Pydantic v2 + `jsonschema>=4.0` |
| Vector store | Qdrant (Sprint 5+) |
| Estado conversacional | Redis (decisión final en Sprint 6) |
| Audit log | HMAC chain (Sprint 6) |
| Observabilidad | OpenTelemetry (Sprint 6+) |
| Empaquetado | Docker multi-stage + Compose con perfiles `dev` y `prod` |

---

## 3. Estado actual del prototipo (este proyecto)

### 3.1 Archivos en producción del prototipo

```
index.html                          ← shell HTML + Tailwind config + carga de scripts
app.jsx                             ← orquestador de vistas y shell
state.jsx                           ← contexto global · capabilities mock · módulos · KPIs
conversation.jsx                    ← thread del chat · intent detection · llamada a Claude
chat.jsx                            ← ChatThread, AssistantTurn, UserTurn, EmptyState
embeds.jsx                          ← artefactos: LineChart, CausalAlert, PredictionChart, stubs
composer.jsx                        ← input multilínea + tools
topbar.jsx                          ← cabecera (Fecha, Última, Pendientes, KPI, módulos, bell, asistente)
sidebar.jsx                         ← ámbitos autorizados + temáticas por semana + usuario footer
kpi-band.jsx                        ← banda de KPIs con expansión inline + gráficos
panels.jsx                          ← paneles laterales (Report preview, Permisos)
view-actions.jsx                    ← vista Acciones (cola + detalle + audit log)
view-reports.jsx                    ← vista Reportes (catálogo gerencia-aware)
view-kpis-and-auth.jsx              ← vista KPIs streaming + Login + Bootstrap
icons.jsx                           ← set de íconos SVG inline
tweaks-panel.jsx                    ← deshabilitado · solo para diseño interno
specs/Especificacion-actual.md      ← spec funcional del prototipo
specs/Handoff-ClaudeCode.md         ← este documento
v2/                                 ← snapshot congelado del look & feel aprobado
v1/                                 ← versión inicial (referencia histórica)
Overview.html                       ← vista panorámica · 21 artboards
Secuencia Bootstrap.html            ← demo capability-driven del bootstrap
Comparativo KPIs.html               ← demo con/sin módulo KPIs
```

### 3.2 Vistas implementadas

| Vista | Estado | Hash URL |
|---|---|---|
| Login | Hecho (formulario interno + OIDC) | `#view=login` |
| Bootstrap | Hecho (7 pasos secuenciales) | `#view=bootstrap` |
| Chat (con conversación) | Hecho (interactivo con Claude) | `#view=chat` |
| Chat (empty state) | Hecho | `#view=empty` |
| KPIs (`on-line`) | Hecho (dashboard 6 indicadores) | `#view=kpis` |
| Reportes | Hecho (catálogo gerencia-aware + filtros) | `#view=reports-catalog` |
| Acciones | Hecho (cola + detalle + audit) | `#view=actions` |
| Panel Report Preview | Hecho | `#view=chat&panel=report-preview` |
| Panel Permisos | Hecho | `#view=chat&panel=permisos` |

### 3.3 Stack del prototipo

| Capa | Prototipo | Producción objetivo |
|---|---|---|
| Framework | React 18 (UMD) + Babel runtime | React 18 + TypeScript estricto + Vite |
| Estilos | Tailwind CDN | Tailwind 3 + CSS vars desde `/capabilities.ui` |
| Componentes UI | JSX hand-rolled | shadcn/ui (Radix + Tailwind) |
| Iconos | SVG inline custom | `@tabler/icons-react` |
| Gráficos | SVG hand-rolled | Recharts |
| Tablas | HTML/CSS manual | TanStack Table |
| Estado global | `useContext` + `useState` | Zustand con `persist` |
| Routing | `tweaks.view` | React Router v6 |
| Auth | Mock | Cookies HttpOnly + `/auth/refresh` interceptor |
| LLM call | `window.claude.complete` (demo) | `fetch` autenticado a backend |

---

## 4. Vistas del producto (lo que Claude Code debe construir)

> Cada vista del prototipo es la fuente visual y funcional. Aquí solo se
> documentan los puntos de conexión con el backend.

### 4.1 Login

- 2 modos según variable de entorno `AUTH_MODE`:
  - `iam_interno`: formulario user/password local
  - `idp_externo`: redirect a IdP del cliente (Entra ID / Keycloak / Okta)
- Backend setea cookies HttpOnly (`jwt`, `refresh_token`).
- **Sin token en JS** — solo cookies.

### 4.2 Bootstrap

- Splash transitorio mientras se carga `/capabilities` y `/auth/me`.
- 7 pasos secuenciales con feedback visual.
- **Si `/capabilities` falla**: modo degradado con banner "configuración no disponible", solo chat básico.

### 4.3 Chat (vista principal)

Composición:
- **TopBar** con identidad del usuario, módulos, notificaciones, asistente activo.
- **KPI Band** colapsable (solo si módulo KPIs activo).
- **Sidebar** con ámbitos autorizados + temáticas (solo en Chat).
- **Thread del chat** con mensajes + artefactos embebidos.
- **Composer** con textarea, scope chips, herramientas.

**Endpoint principal**: `POST /conversaciones/{id}/mensajes`. Devuelve
artefactos tipados (ver §5).

### 4.4 Empty state

- Hint pequeño al arrancar (chat vacío).
- El usuario activa conversación tipeando o usando botón "Última" para
  cargar la última conversación persistida.

### 4.5 Reportes (vista del Módulo 2)

- Título: `"Reportes Gerencia {usuario.gerencia}"`.
- Filtro segmentado: Todos · Habilitados · No habilitados.
- Cada tarjeta muestra: ID, tipo (operativo/gerencial), nombre,
  descripción, formatos disponibles, dueño, versión actual.
- **Los no habilitados aparecen con candado** y razón (`rol Gerencia`,
  etc.) — visibilidad total, ejecución filtrada por permisos.
- **No hay reportes ad-hoc** — solo catálogo preacordado.
- Formatos disponibles **se cargan dinámicamente** según herramientas
  corporativas del cliente. **No mostrar proveedor de nube** en la UI.

### 4.6 Acciones (vista del Módulo 3 · delicado)

- Cola lateral (320px) + detalle a la derecha.
- Estados: pendiente · esperando aprobación · aprobada · ejecutada · rechazada · fallida.
- **Doble custodia** para acciones riesgo medio/alto: requiere aprobación
  de tercero antes de ejecutar.
- **Audit log obligatorio** con timestamp, actor, acción y detalle.
  Retención configurable por rol (5 años para auditor).
- Tipos soportados: `ENVIAR_CORREO`, `WHATSAPP`, `AGENTE_IA`.

### 4.7 KPIs / on-line (vista del Módulo 4)

- Dashboard de 6 KPIs en tiempo real.
- En v1.0 = batch (refrescar manualmente). **SSE = deuda técnica post-v1.0**
  (ADR-002). El frontend debe ser tolerante a esa migración futura.

### 4.8 Paneles laterales

- **Report Preview** (Claude.ai-style): preview tabular + descarga en
  formatos del cliente.
- **Permisos / "¿Qué estoy viendo?"**: filtros JWT aplicados, KPIs
  bloqueados, indicador de PII oculta.

---

## 5. Contratos backend ↔ frontend

> ⚠️ **IMPORTANTE**: estos endpoints **no existen aún** en el repo
> `Asistente-agentico/diseno`. Sprint 6 (HU6.1–HU6.7) los crea. Este
> documento los propone como contrato de referencia, alineado con las
> decisiones D1–D15, ADRs 1–4 y los schemas YAML existentes
> (`rules`, `models`, `intents`, `causal`, `embeddings`, `landing`).

### 5.1 Bootstrap

`GET /capabilities`

Llamada inicial. Devuelve todo lo que la UI necesita saber del despliegue.

```json
{
  "version": "1.0",
  "hash": "abc123",
  "tenant": {
    "id": "default",                      // D6: single-tenant default
    "nombre": "Cliente Demo",
    "expira": "2027-01-01T00:00:00Z"      // ADR-003: fecha de la licencia
  },
  "licencia": {
    "estado": "vigente" | "modo_gracia" | "vencida",
    "modulos_autorizados": ["central", "kpis", "reportes", "acciones"],
    "usuarios_max": 50,
    "modo_gracia_dias_restantes": 0
  },
  "usuario": {
    "id_pseudo": "u_a1b2c3d4",            // HMAC del id real
    "nombre": "Nombre Apellido",
    "rol": "operador",                    // de domain.yaml roles
    "gerencia": "Operaciones",
    "permisos": ["consultar", "ver_kpis"],
    "filtros_jwt": [                       // para panel "¿Qué estoy viendo?"
      { "campo": "gerencia", "valor": "Operaciones" },
      { "campo": "region",   "valor": "Region X" }
    ]
  },
  "modulos": {
    "central":  { "estado": "ok" },
    "kpis":     { "estado": "ok", "features": ["batch"] },
    "reportes": { "estado": "ok", "features": ["pdf", "xlsx"] },
    "acciones": { "estado": "ok", "tipos": ["ENVIAR_CORREO", "WHATSAPP"] },
    "ml":       { "estado": "hidden" }
  },
  "ui": {
    "titulo": "Asistente Virtual",
    "subtitulo": "tu apoyo operativo",
    "color_navy": "#0A2540",
    "color_coral": "#E85C3C",
    "color_paper": "#FAFAF7",
    "color_cream": "#F2EEDF"
  },
  "asistente_activo": {
    "id": "engorda",                      // de domain.yaml.ui.asistentes
    "nombre": "Engorda",
    "subtitulo": "Centros y jaulas",
    "version": "v2.4.1"
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-7"
  },
  "ambitos_autorizados": [                 // filtrados por rol/permisos
    {
      "id": "mortalidad",
      "nombre": "Mortalidad",
      "tematicas": [                       // configurables por usuario
        { "id": "t1", "fecha": "14 may", "titulo": "Brote agudo CTR-007 jaula 4", "conversaciones": 2 }
      ]
    }
  ],
  "kpis_usuario": [                        // configurables por rol + gerencia
    {
      "id": "mort",
      "label": "Mortalidad diaria",
      "value": "27 u/d",
      "delta": "+38%",
      "severity": "bad",                   // ok | warn | bad
      "chart": "line",                     // line | bar | gauge | progress
      "subtitle": "CTR-007 · 14 días",
      "series": [11, 12, 10, ...],
      "target": { "lo": 8, "hi": 14 },
      "stats": [["acumulado 14d", "237 u"]]
    }
  ]
}
```

### 5.2 Consulta principal (LLM)

`POST /conversaciones/{id}/mensajes`

```json
// Request
{
  "texto": "Mortalidad última semana en CTR-001",
  "asistente_id": "engorda",
  "fecha_consulta": null,                  // HU6.5: opcional, 400 si vista no soporta histórico
  "hints": {
    "grafico_rule_id": "MORT_DIA_C001",
    "ventana_dias": "7"
  }
}

// Response
{
  "mensaje_id": "msg_xyz",
  "respuesta": "En los últimos 7 días, CTR-001 registró...",
  "artefactos": [
    { "tipo": "serie_temporal", "version": 1, ... },
    { "tipo": "banner", "version": 1, "variante": "causal", ... },
    { "tipo": "prediccion", "version": 1, ... },        // si módulo ML activo
    { "tipo": "archivo_descargable", "version": 1, ... },// si módulo Reportes activo
    { "tipo": "accion_propuesta", "version": 1, ... }    // si módulo Acciones activo
  ],
  "metadata": {
    "chunks_used": 7,                       // HU6.3 audit log
    "scopes": ["mortalidad_cultivo"],
    "ambiguous_routing": false,
    "permisos_aplicados": {
      "rol": "operador",
      "filtros_jwt_aplicados": [...]
    }
  },
  "blocked": false,
  "error": null
}
```

### 5.3 Refresh ligero (sin LLM)

`POST /conversaciones/{id}/mensajes/{msg_id}/refresh-grafico`

Para cambiar la ventana del gráfico sin reinvocar el LLM. Latencia esperada
< 100 ms. Mismo shape que `serie_temporal`.

### 5.4 KPIs (Módulo 4)

`GET /kpis/usuario` — KPIs del usuario actual con valores actuales.

(SSE = post-v1.0 — el frontend debe arquitecturarse para soportarlo, pero
en v1.0 usa polling o pull.)

### 5.5 Reportes (Módulo 2)

| Endpoint | Función |
|---|---|
| `GET /reportes/catalogo` | Catálogo filtrado por gerencia del usuario |
| `GET /reportes/{id}/preview` | Preview tabular |
| `GET /reportes/{id}/download?format={xlsx\|pdf\|pptx\|pbi}` | Descarga |

### 5.6 Acciones (Módulo 3)

| Endpoint | Función |
|---|---|
| `GET /acciones` | Cola de acciones del usuario |
| `GET /acciones/{id}` | Detalle con audit log |
| `POST /acciones/{id}/solicitar-aprobacion` | Inicia flujo de doble custodia |
| `POST /acciones/{id}/aprobar` | Tercero aprueba (con permiso) |
| `POST /acciones/{id}/ejecutar` | Ejecuta (solo si aprobada) |
| `POST /acciones/{id}/descartar` | Descarta borrador |

### 5.7 Audit (HU6.3, HU6.7)

| Endpoint | Función |
|---|---|
| `POST /audit/event` | UI envía eventos auditables (login, descarga, etc.) |
| `GET /audit/reconstruir/{consulta_id}` | Auditor reconstruye respuesta histórica |

### 5.8 Headers transversales

| Header | Función |
|---|---|
| `Authorization: Bearer <JWT>` | Solo en SSE cross-origin |
| `X-Client-Version` | Versión del frontend (de `package.json`) |
| `X-Capabilities-Version` | Hash de `/capabilities` vigente. Si difiere, refetch |
| `X-Latest-Client-Version` | Backend indica si hay frontend más nuevo |
| `Accept-Language` | Idioma del usuario |

### 5.9 Errores

Formato uniforme:

```json
{
  "error": {
    "code": "RBAC_DENIED" | "VALIDATION_ERROR" | "LLM_BLOCKED" | "LICENSE_EXPIRED" | "MODULE_NOT_LICENSED" | ...,
    "message": "Mensaje en español neutro",
    "details": { /* opcional */ }
  }
}
```

Códigos HTTP: 400, 401, 403, 404, 409, 426 (cliente desactualizado),
500, 502 (módulo opcional caído), 503 (mantenimiento).

---

## 6. Catálogo de artefactos (lo que el LLM emite y la UI renderiza)

El **dispatcher de artefactos** es el patrón clave. Cada artefacto tiene
`tipo` y `version`. Si la UI no reconoce un tipo o versión, renderiza
`<UnknownArtifactPlaceholder>` y loguea warning. **No crashea**.

### 6.1 Tipos pasivos (display)

| Tipo | Renderiza | Origen |
|---|---|---|
| `serie_temporal` | Gráfico Recharts (line / bar) con zona objetivo opcional | Módulo central (RAG sobre vistas dbt) |
| `tabla` | TanStack Table con sort, filter, paginate | Módulo central |
| `tablero_kpi` | Grid de KPIs con valor + delta + sparkline opcional | Módulo central |
| `banner` | Card con variante (info/warning/error/success/causal/mantenimiento) | Módulo central |
| `imagen` | `<img>` con alt + ancho_max | Módulo central |
| `prediccion` | Línea histórica + banda de IC + horizonte futuro | **Módulo ML** (D7) |

### 6.2 Tipos interactivos

| Tipo | Renderiza | Origen |
|---|---|---|
| `accion_propuesta` | Card editable + flujo de aprobación | **Módulo Acciones** |
| `archivo_descargable` | Botón descarga (base64 inline o URL firmada) | **Módulo Reportes** |
| `formulario` | React Hook Form + Zod | Módulo central |
| `seleccion` | Lista de opciones que disparan follow-up | Módulo central |

### 6.3 Streaming

| Tipo | Renderiza | Origen |
|---|---|---|
| `kpi_stream` | Update inline de un KPI ya renderizado | **Módulo KPIs** (post-v1.0) |
| `progreso` | Barra de progreso | Módulo central |

### 6.4 Metadata (provenance)

| Campo | Renderiza | HU |
|---|---|---|
| `chunks_used` | Pildorita "N chunks utilizados" colapsable | HU6.3 |
| `scopes` | Dentro de la misma pildorita | HU6.3 |
| `permisos_aplicados` | Panel "¿Qué estoy viendo?" | D2 |

### 6.5 Capability-driven filtering

Cuando un artefacto cuyo módulo no está disponible llega al frontend:

| Módulo estado | Comportamiento |
|---|---|
| `ok` | Renderiza normalmente |
| `hidden` | **No renderiza** el artefacto. El LLM debe ser informado en el system prompt para no mencionarlo |
| `locked` | Renderiza atenuado con CTA "no incluido" (showcase comercial) |
| `error` | Renderiza placeholder de error con indicador rojo |

---

## 7. Modelo de configuración (3 capas)

### Capa 1 — Build-time
- Fuentes empaquetadas
- Iconos
- Tailwind config
- Defaults universales

### Capa 2 — Deploy-time (env vars)

Materializadas en `/config.js` por entrypoint del Docker:

```
BACKEND_URL_CENTRAL
AUTH_MODE                    (iam_interno | idp_externo)
AUTH_IDP_URL
IDIOMA_DEFAULT               (es | en | pt)
TENANT_ID                    (default en single-tenant)
OTEL_EXPORTER_OTLP_ENDPOINT
SENTRY_DSN
TELEMETRY_ENABLED
```

### Capa 3 — Runtime (`/capabilities`)

Marca, colores, asistentes, ámbitos, KPIs, módulos contratados. Refetch
cuando cambia `X-Capabilities-Version`.

**Cascada**: capa 3 > capa 2 > capa 1.

---

## 8. Seguridad y RBAC visual

### 8.1 RBAC visual (pre-checks léxicos)

El frontend hace **pre-checks léxicos** para cortocircuitar consultas
obviamente fuera de scope antes de pegarle al backend (patrón heredado
del demo). La fuente autoritativa es el backend (`RBACAdapter`).

```js
const KEYWORDS_FUERA_DE_SCOPE = {
  // configurable por dominio vía DomainPack
};
```

### 8.2 PII oculta por defecto

El backend enmascara PII antes de devolver chunks al LLM (D2,
`pii_estrategia: tokenizacion`). El frontend muestra panel
"¿Qué estoy viendo?" con confirmación de PII oculta.

### 8.3 Cookies HttpOnly

JWT y refresh_token solo en cookies. **Nunca** en `localStorage` ni en JS.

### 8.4 CSP estricto

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' {BACKEND_URLS};
  frame-ancestors 'none';
```

### 8.5 Audit eventos del frontend

UI envía a `POST /audit/event` (HU6.3):
- Login / logout
- Confirmación de acción (HU8.5)
- Descarga de reporte
- Cambio de preferencias

---

## 9. Internacionalización

- v1.0: `es` (default), `en`, `pt`. Más idiomas → agregar JSON en `locales/`.
- Cascada: preferencia explícita > `Accept-Language` > `IDIOMA_DEFAULT` > `es`.
- Strings UI core: `react-i18next` con bundles offline.
- Strings dinámicos (por tenant): `/capabilities?lang={lang}` ya traducidos.
- Pluralización: ICU de i18next.
- Fechas y números: `Intl.DateTimeFormat`, `Intl.NumberFormat`.

---

## 10. Mobile y responsive

- **Responsive web mobile-first** como única superficie en v1.0.
- PWA = post-v1.0 si un cliente lo pide.
- Capacitor / app nativa = solo si emerge necesidad real.
- Breakpoints Tailwind: `sm 640 / md 768 / lg 1024 / xl 1280`.
- Sidebar → drawer hamburguesa en mobile.
- Touch targets ≥ 44 px.

---

## 11. Observabilidad

| Categoría | Captura | Exporta |
|---|---|---|
| Errores | Excepciones no atrapadas, error boundaries, 5xx | Sentry-compatible SDK → `SENTRY_DSN` |
| Métricas | Core Web Vitals, latencia API, navegación | OpenTelemetry → `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Audit | Login, descargas, acciones, cambios | `POST /audit/event` al módulo central |

**`TELEMETRY_ENABLED=false`** deshabilita exportación externa (modo
air-gapped) pero **mantiene** audit interno.

### Qué NO se reporta nunca:
- Contenido de mensajes
- Valor de campos de formularios
- JWT o credenciales
- Contenido de `/capabilities`
- Identidad en claro (siempre `id_pseudo` HMAC)

---

## 12. Empaquetado Docker

### 12.1 Dockerfile (multi-stage)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VERSION
RUN npm run build -- --define:__APP_VERSION__=\"${VERSION}\"

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### 12.2 `entrypoint.sh`

Materializa env vars a `/config.js`:

```sh
#!/bin/sh
cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  BACKEND_URL_CENTRAL: "${BACKEND_URL_CENTRAL}",
  AUTH_MODE: "${AUTH_MODE}",
  TENANT_ID: "${TENANT_ID:-default}"
  ...
};
EOF
exec "$@"
```

### 12.3 Tamaño esperado

- Imagen Docker final: ~20 MB
- Bundle JS gzipped inicial: ~250 KB
- Tiempo de bootstrap esperado en 3G: < 5 s

---

## 13. Mapping prototipo → archivos del repo backend

Cada componente del prototipo se traduce a llamadas concretas al backend:

| Componente prototipo | Endpoint backend | YAML que lo data-drive |
|---|---|---|
| `Brand` (sidebar) | `/capabilities.ui.titulo` | (no YAML) |
| `AmbitoPanel` | `/capabilities.ambitos_autorizados` | `rules/<scope>.yaml`.scope + RBAC |
| `TematicaItem` | `/capabilities.ambitos_autorizados[].tematicas` | (config UI por usuario) |
| `KpiBand` | `/capabilities.kpis_usuario` | `rules.yaml` rules con `tipo=kpi` |
| `KpiCard` (chart line) | embebido en kpi | `models.yaml` (si predicción) |
| `LineChart` (serie_temporal) | artefacto de `POST /conversaciones/{id}/mensajes` | `rules.yaml` |
| `CausalAlert` (banner causal) | artefacto | `causal.yaml` DAG |
| `PredictionChart` | artefacto (módulo ML) | `models.yaml` con `tipo=causal` |
| `ActionStub` → vista Acciones | `POST /acciones/{id}/solicitar-aprobacion` | `rules.yaml` con modelos `tipo=accion` |
| `ReportStub` → panel preview | `GET /reportes/{id}/preview` | catálogo `reportes.yaml` (Sprint 8) |
| `ChatThread` | `POST /conversaciones/{id}/mensajes` | `rules.yaml` + `intents.yaml` |
| `chunks_used` pildorita | `metadata.chunks_used` | HU6.3 |
| `PermisosPanel` | `metadata.permisos_aplicados` | D2 + HU6.3 |
| `ModulesNav` | `/capabilities.modulos` + `/capabilities.licencia` | ADR-003 |
| `AuditLog` (Acciones) | `GET /acciones/{id}` con `audit[]` | HU6.3 + HU8.5 |
| `RoleSelect` (login) | `/domain.roles[]` (vía capabilities) | `domain.yaml.roles` |
| `RetencionBadge` | `rules[].retencion_dias` | `rules.yaml` |

---

## 14. Decisiones pendientes que afectan el frontend

| Decisión | Cuándo | Impacto |
|---|---|---|
| LLM por defecto | Sprint 5 | Cambia el provider mostrado en `/capabilities.llm` |
| Estado conversacional (Redis vs Postgres) | Sprint 6 | Diferencia entre `localStorage` cache y polling |
| Telemetría destino | Sprint 6 | Configurable vía env, no afecta UI |
| Política de retención audit log | Sprint 6 | UI muestra el límite por rol |
| Política de versionado modelos | Sprint 9 | UI muestra versión actual en KPIs/predicciones |
| **Frontend (este)** | **Sprint 6** | Construcción real |
| UI configuración (Sprint 10) | Sprint 10 | Otro producto, fuera de scope |

---

## 15. Roadmap de migración prototipo → producción

### Fase A · Setup (1-2 días)

1. Crear repo nuevo `Asistente-agentico/customer-ui` (o branch del actual).
2. Scaffolding: Vite + React 18 + TS estricto + Tailwind 3 + shadcn/ui.
3. Docker multi-stage + nginx + entrypoint que materializa env vars.
4. Setup CI: build, lint, test, axe, npm audit, Trivy.

### Fase B · Componentes base (3-5 días)

1. Cliente HTTP con interceptor de refresh.
2. Tipos TypeScript de discriminated unions de artefactos (§6).
3. Store Zustand para capabilities + sesión.
4. Layout shell (TopBar + Sidebar + KpiBand + Footer).
5. Componentes shadcn copy-paste necesarios: Sheet, DropdownMenu,
   Dialog, Toggle, Tabs.

### Fase C · Chat MVP (5-7 días)

1. `ChatThread` + `AssistantTurn` + `UserTurn` con efecto de tipeo.
2. `Composer` con scope chips.
3. Dispatcher de artefactos (§6) — empezar por `texto_respuesta`,
   `serie_temporal`, `banner`, `chunks_used` pildorita.
4. Empty state.
5. Botón "Última" con toggle on/off.

### Fase D · Módulos opcionales (10-14 días)

1. **Módulo Reportes**: vista catálogo + panel preview lateral.
2. **Módulo Acciones**: vista cola + detalle + audit log + flujo aprobación.
3. **Módulo KPIs**: vista `on-line` + KpiBand inline.
4. Notificaciones dropdown.

### Fase E · Hardening (5-7 días)

1. CSP estricto + security headers.
2. Auth real (cookies HttpOnly + refresh interceptor + redirect 401).
3. i18n con `es` / `en` / `pt`.
4. Accesibilidad WCAG 2.1 AA (axe-core CI + manual con NVDA / VoiceOver).
5. Mobile responsive completo + drawer hamburguesa.
6. Tests: Vitest + Testing Library + Playwright para flujos principales.

### Fase F · Integración con backend real (5-10 días)

1. Reemplazar mocks por llamadas reales.
2. Validar comportamiento ante cada estado de módulo (ok/hidden/locked/error).
3. Validar guardrails (`blocked`, `error`) del backend.
4. Smoke tests E2E contra deploy staging.

**Total estimado**: 4 a 6 semanas para v1.0 productiva.

---

## 16. Decisiones técnicas que Claude Code debe tomar

1. **Vite vs Next.js**: Vite recomendado (SPA pura, no se justifica SSR para
   esta UI capability-driven).
2. **Zustand vs Redux Toolkit**: Zustand (menos boilerplate, ya sirve para
   capabilities + sesión).
3. **Recharts vs Visx vs ECharts**: Recharts (suficiente para los chart
   types del prototipo: line, bar, gauge, progress).
4. **shadcn vs Mantine vs Chakra**: shadcn (copy-paste, customizable,
   bajo bundle).
5. **react-i18next vs react-intl**: react-i18next (mejor soporte de
   bundles offline).
6. **Cómo manejar el efecto de tipeo en `AssistantTurn`**: simple
   `setInterval` o framer-motion (decidir según necesidad).
7. **PWA flag en `vite.config.ts`**: dejarlo activable vía env, no
   forzar en v1.0.

---

## 17. Anti-patrones a evitar

- **No usar `localStorage` para datos sensibles** (PII, contenido de chat).
- **No pegarle al LLM desde el frontend directamente** — siempre vía
  backend.
- **No hardcodear módulos** — todo via `/capabilities`.
- **No hardcodear dominio salmonero** — la UI debe ser dominio-agnóstica.
  Los nombres como "engorda", "CTR-007", "Mortalidad" vienen del backend.
- **No renderizar HTML crudo del LLM** — siempre pasar por
  `react-markdown` + `rehype-sanitize`.
- **No exponer `chunks_used` content** en el frontend — solo IDs y scopes.
- **No skippear el banner de licencia vencida** — bloqueo total con CTA
  a renovar.
- **No hacer SSE en v1.0** — ADR-002 lo difiere a post-v1.0.

---

## 18. Checklist de entrega Sprint 6

- [ ] `GET /capabilities` retornando JSON completo según §5.1.
- [ ] `POST /auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`.
- [ ] `POST /conversaciones/{id}/mensajes` con respuesta tipada y artefactos.
- [ ] `GET /conversaciones` paginado.
- [ ] Manejo de `blocked`, `error`, `LICENSE_EXPIRED`, `MODULE_NOT_LICENSED`.
- [ ] Audit eventos del frontend a `POST /audit/event`.
- [ ] Soporte de `X-Capabilities-Version` y refresh.
- [ ] Sidebar gerencia-aware y ámbito-aware.
- [ ] KPI band con `/capabilities.kpis_usuario`.
- [ ] Cluster de módulos con estado (`ok`/`hidden`/`locked`/`error`).
- [ ] Panel "¿Qué estoy viendo?" funcional.
- [ ] Login modo IAM + IdP externo.
- [ ] Bootstrap splash con pasos secuenciales.
- [ ] Empty state.
- [ ] Demo del prototipo (este Omelette) como aceptación visual.

---

## 19. Apéndices

### A · Archivos del repo backend que Claude Code debe leer obligatoriamente

1. `README.md` — overview general
2. `CLAUDE.md` — contexto operativo y decisiones cerradas
3. `HANDOFF_CODIFICACION.md` — contrato de arranque
4. `docs/decisiones/HISTORIAS_USUARIO.md` — 61 HUs
5. `docs/decisiones/ADR-001-datamart-data-vault.md`
6. `docs/decisiones/ADR-002-lakehouse-deuda-streaming.md`
7. `docs/decisiones/ADR-003-licenciamiento-antipirateria.md`
8. `docs/decisiones/ADR-004-eliminar-perfil-offline.md`
9. `docs/arquitectura/contratos.md` — 8 Protocols / Adapters
10. `docs/schemas/_common.md` — types compartidos
11. `docs/schemas/rules.md` — schema central de la UI
12. `docs/schemas/models.md`
13. `docs/schemas/intents.md`
14. `docs/sprints/SPRINT_1_CIERRE.md` — qué se entregó en Sprint 1

### B · Cómo Claude Code debe consumir el prototipo

1. Abrir `index.html` en el browser para ver el chat funcional.
2. Abrir `Overview.html` para vista panorámica de las 21 vistas.
3. Leer `specs/Especificacion-actual.md` para la spec funcional.
4. Leer cada archivo `.jsx` para entender la composición:
   - `app.jsx` — orquestación
   - `state.jsx` — estado global y mocks de capabilities
   - `conversation.jsx` — flujo del chat con artefactos
   - `embeds.jsx` — cómo renderiza cada artefacto
   - `topbar.jsx`, `sidebar.jsx`, `kpi-band.jsx`, `composer.jsx` — chrome
   - `view-*.jsx` — vistas de módulos opcionales
5. Tomar el look & feel exacto del prototipo: paleta, tipografías,
   espaciados, animaciones, micro-interacciones, etc.
6. **Reemplazar mocks** de `state.jsx` y `conversation.jsx` por las
   llamadas reales al backend descritas en §5.

### C · Preguntas para resolver en kick-off del Sprint 6

1. ¿Dónde se aloja el repo del frontend? ¿Branch del repo `diseno` o repo
   nuevo `customer-ui`?
2. ¿Vite + TS o se prefiere otro stack?
3. ¿shadcn copy-paste o se prefiere otro design system?
4. ¿Cuál es el dominio canónico genérico que reemplaza a "salmonera" en
   los ejemplos del frontend?
5. ¿Cuándo se decide LLM default (Sprint 5)?
6. ¿Cuándo se decide Redis vs Postgres para estado conversacional?
7. ¿Cuál es el comportamiento esperado en modo de gracia (ADR-003)?
   ¿Read-only con banner permanente? ¿Solo módulo central activo?

---

**Fin del documento.**

Para cualquier consulta sobre este handoff, contactar al equipo de diseño
(este proyecto Omelette).
