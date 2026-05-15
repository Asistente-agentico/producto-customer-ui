# Especificaciones actuales del repo `producto-customer-ui`

> Resumen ejecutivo del estado del repositorio
> `Asistente-agentico/producto-customer-ui@main` al **2026-05-14**.
>
> **Fuente**: lectura de `README.md`, `docs/spec.md`, `docs/plan.md`,
> `docs/handoff-design.md`, `package.json` y la estructura completa de
> `src/`, `docker/` y `.github/`.

---

## 1. Estado actual

✅ **Implementación end-to-end completada.** Los 12 hitos del plan
(H0–H12) están commiteados, 48 tests pasando, CI verde, imagen Docker
~20 MB cloud-agnóstica.

✅ **Las 10 ambigüedades A1–A10** del plan quedaron resueltas con las
recomendaciones del propio plan (sección 6 de `plan.md`).

⏸️ **Pendiente externo**: el módulo central V2 que implemente el contrato
HTTP del spec. Mientras tanto, la UI corre con **MSW** (Mock Service
Worker) reflejando 1:1 el contrato.

---

## 2. Stack tecnológico (en producción del repo)

| Capa | Implementación |
|---|---|
| Framework | React 18.3 + TypeScript 5.6 estricto |
| Build | Vite 5.4 |
| Estilos | Tailwind 3.4 + CSS vars desde `/capabilities` |
| Componentes | shadcn-style primitives copy-paste |
| Iconos | `@tabler/icons-react` 3.21 |
| Estado | Zustand 5.0 (con `persist`) + TanStack Query 5.59 |
| Routing | React Router 6.28 (lazy + Suspense) |
| Gráficos | Recharts 2.13 |
| Tablas | TanStack Table 8.20 |
| Forms | React Hook Form 7.53 + Zod 3.23 |
| i18n | react-i18next 15.1 (es, en, pt) |
| SSE | `@microsoft/fetch-event-source` 2.0 |
| Mocks | MSW 2.6 (dev y tests) |
| Observabilidad | Sentry-compatible SDK + OpenTelemetry browser |
| Tests | Vitest 2.1 + Testing Library + axe-core |
| Markdown | react-markdown 9.0 + rehype-sanitize 6.0 |
| Imagen Docker | `node:20-alpine` (build) + `nginx:alpine` (serve) |

---

## 3. Arquitectura visual implementada

### 3.1 Rutas del producto

```
/login                        # auth page (iam_interno + idp_externo OIDC PKCE)
/chat                         # chat sin conversación activa
/chat/:conversacionId         # conversación específica
/dashboard                    # KPIs streaming en vivo (SSE)
/reportes                     # catálogo de reportes + descargas
/configuracion                # perfil, idioma, preferencias
```

### 3.2 Layout (`AppLayout.tsx`)

- **TopBar** (`src/app/TopBar.tsx`, 4 KB): branding del tenant, switcher
  de idioma, menú de perfil, indicadores.
- **Sidebar** (`src/app/Sidebar.tsx`, 4 KB): colapsable, asistentes
  filtrados por rol/permisos, lista de conversaciones, link a dashboard.
- **ProtectedRoute** (`src/app/ProtectedRoute.tsx`): guarda routes con
  auth + bootstrap completo (`/auth/me` → `/capabilities` → branding).
- **VersionBanner**: aviso de nueva versión disponible.

### 3.3 Features implementadas (`src/features/`)

| Feature | Estado |
|---|---|
| `auth/LoginPage.tsx` | iam_interno + idp_externo |
| `chat/ChatPage.tsx` + `ChatInput.tsx` + `MessageBubble.tsx` + `FuentesPill.tsx` | thread + composer + chunks pildorita |
| `kpis/` | dashboard SSE en vivo |
| `reportes/` | catálogo + descargas (base64 + URL firmada) |
| `acciones/` | confirmación human-in-the-loop con 3 niveles de fricción |
| `configuracion/` | preferencias del usuario, switcher de idioma server-side |
| `conversaciones/` | lista, crear, eliminar, persistencia |

---

## 4. Dispatcher de artefactos (núcleo del chat)

**11 artefactos tipados** + placeholder forward-compat. Cada uno tiene
schema Zod en `src/api/types.ts` y se carga con `React.lazy` + `Suspense`
para mantener bundle inicial < 250 KB gzipped.

| Archivo | Artefacto | Origen |
|---|---|---|
| `TextoMarkdown.tsx` | (no es artefacto — es el texto del response) | Módulo central |
| `SerieTemporalCard.tsx` (5 KB) | `serie_temporal` (line/bar con switcher de ventana) | Módulo central · refresh sin LLM via endpoint específico |
| `BannerCard.tsx` | `banner` (variantes info/warning/error/success/causal/mantenimiento) | Módulo central |
| `TablaCard.tsx` (6 KB) | `tabla` (TanStack Table con sort/filter/paginate) | Módulo central |
| `TableroKpiCard.tsx` | `tablero_kpi` (KPIs con bloqueados) | Módulo central |
| `ImagenCard.tsx` | `imagen` | Módulo central |
| `ProgresoCard.tsx` | `progreso` | Módulo central |
| `AccionPropuestaCard.tsx` (7 KB) | `accion_propuesta` con riesgo bajo/medio/alto | Módulo Acciones |
| `ArchivoDescargableCard.tsx` | `archivo_descargable` (base64 inline + URL firmada) | Módulo Reportes |
| `FormularioCard.tsx` (4 KB) | `formulario` (RHF + Zod dinámico) | Módulo central |
| `SeleccionCard.tsx` | `seleccion` (opciones que disparan follow-up) | Módulo central |
| `UnknownArtifactPlaceholder.tsx` | tipos desconocidos (forward-compat) | — |

**Patrón**: `ArtefactDispatcher.tsx` usa discriminated union exhaustiva
sobre `tipo` literal. Cualquier artefacto desconocido cae a
`UnknownArtifactPlaceholder` sin crashear.

---

## 5. API client y contratos (`src/api/`)

### 5.1 Archivos del cliente HTTP

| Archivo | Contenido |
|---|---|
| `client.ts` (8 KB) | Fetch wrapper, interceptor refresh 401, eventos globales (`new_version_available`, `capabilities_version_changed`, `auth_lost`), `credentials: 'include'` |
| `errors.ts` | `ApiError` tipado con `code`, `message`, `details` |
| `types.ts` (16 KB) | **Zod schemas de TODO el contrato** — `Capabilities`, `Conversacion`, `MensajeResponse`, los 11 artefactos como discriminated union |
| `auth.ts` | `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout` |
| `capabilities.ts` | `GET /capabilities` |
| `conversaciones.ts` | CRUD de conversaciones + envío de mensajes |
| `kpis-sse.ts` (5 KB) | SSE client con `Last-Event-ID`, reconexión, throttle |
| `reportes.ts` | catálogo + descarga |
| `audit.ts` | `POST /audit/event` |
| `usuario.ts` | preferencias |

### 5.2 Endpoints del contrato

#### Bootstrap

- `GET /capabilities` — toda la configuración del despliegue
- `GET /auth/me` — perfil del usuario autenticado
- `GET /usuario/preferencias` — idioma, vista inicial, notificaciones

#### Auth

- `POST /auth/login` — formulario (modo `iam_interno`)
- `POST /auth/refresh` — refresh transparente vía cookie
- `POST /auth/logout`
- Modo `idp_externo` redirige a `AUTH_IDP_URL` (OIDC Authorization Code + PKCE)

#### Conversaciones

- `GET /conversaciones` (paginado)
- `POST /conversaciones`
- `GET /conversaciones/{id}` (historial completo) ⬅️ **NUEVO** sobre spec
- `DELETE /conversaciones/{id}`
- `POST /conversaciones/{id}/mensajes` (LLM call)
- `POST /conversaciones/{id}/mensajes/{msg_id}/refresh-grafico` ⬅️ **NUEVO** sobre spec

#### Módulos opcionales

- `GET /kpis/stream?metricas=...&entidades=...` (SSE)
- `GET /reportes/catalogo`
- `GET /reportes/{report_id}` (descarga directa)
- `POST /accion`

#### Audit

- `POST /audit/event` con `{ evento, recurso?, metadata, ts }`

### 5.3 Headers transversales

| Header | Dirección |
|---|---|
| `X-Client-Version` | UI → backend (siempre, incluso con telemetría off) |
| `X-Latest-Client-Version` | backend → UI (dispara banner de "nueva versión") |
| `X-Capabilities-Version` | backend → UI (dispara refetch si difiere) |
| `Accept-Language` | UI → backend |
| Cookies HttpOnly | JWT + refresh_token (nunca en JS) |

### 5.4 Formato de errores uniforme

```json
{
  "error": {
    "code": "RBAC_DENIED" | "VALIDATION_ERROR" | "LLM_BLOCKED" | "...",
    "message": "Mensaje en español neutro",
    "details": { /* opcional */ }
  }
}
```

**Desviación deliberada**: el central V1 (`sistema_rag`) usa
`HTTPException(detail: str)`. La UI hace wrap sintético hasta que el
central V2 adopte este formato.

---

## 6. Configuración (3 capas — implementada según spec)

### Capa 1 · Build-time
Defaults universales: strings i18n de fallback en español, paleta
fallback, set de iconos Tabler.

### Capa 2 · Deploy-time (env vars en `entrypoint.sh` → `config.js`)

| Variable | Default | Función |
|---|---|---|
| `BACKEND_URL_CENTRAL` | `http://central:8080` | URL del módulo central |
| `AUTH_MODE` | `iam_interno` | `idp_externo` o `iam_interno` |
| `AUTH_IDP_URL` | (vacío) | URL del IdP si externo |
| `IDIOMA_DEFAULT` | `es` | es/en/pt |
| `TENANT_ID` | (vacío) | Solo dedicated |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (vacío) | Vacío → no-op OTel |
| `SENTRY_DSN` | (vacío) | Vacío → fallback a `console.error` |
| `TELEMETRY_ENABLED` | `true` | Toggle global de telemetría externa |
| `USE_MOCKS` | `false` | Solo dev: usa MSW |

### Capa 3 · Runtime (`/capabilities`)

Todo lo que cambia sin redeploy:
- Branding (`ui.titulo`, `ui.color_*`, logo, favicon)
- Asistentes contratados (`ui.asistentes[]`)
- Módulos opcionales (`modulos.{central,kpis,reportes,acciones}`)
- Usuario (`usuario.{id_pseudo, rol, gerencia, permisos, filtros}`)
- Tenant
- Consultas sugeridas por ámbito
- Entidades con regex de extracción

**Cascada**: 3 sobrescribe 2 sobrescribe 1. Si una capa devuelve `null`,
cae a la inferior. La UI nunca queda en blanco.

**Cache `/capabilities`**: 15 minutos en `localStorage` con invalidación
por header `X-Capabilities-Version`.

---

## 7. Decisiones de implementación clave (10 ambigüedades resueltas)

| # | Decisión |
|---|---|
| A1 | **Dominio genérico** en el código. Fixtures de salmonera solo en `src/mocks/fixtures/` para demo |
| A2 | IdP externo = **OIDC Auth Code + PKCE** |
| A3 | Refresh de gráfico vía endpoint específico `POST /conversaciones/{id}/mensajes/{msg_id}/refresh-grafico` |
| A4 | URLs firmadas vía **MinIO o reverse-proxy con token de un solo uso** (cloud-agnóstico) |
| A5 | `X-Client-Version` se envía **siempre** (es auditoría, no telemetría externa) |
| A6 | Cache `/capabilities` = **15 minutos** |
| A7 | Modo degradado = chat plano + sidebar oculta + banner "configuración no disponible" + retry |
| A8 | Auto-rename del ámbito: **lo decide el central**, la UI refresca el título |
| A9 | Versión inicial = **`0.1.0`** |
| A10 | Sentry = **SDK Sentry-compatible** que funciona contra Sentry SaaS, self-hosted o **GlitchTip self-hosted** (default sugerido) |

---

## 8. Modo degradado y modo mocks

### Modo degradado (si `/capabilities` falla)
- Chat plano contra módulo central
- Sidebar oculta
- Banner persistente "configuración no disponible" + botón "reintentar"

### Modo mocks (dev)
- `USE_MOCKS=true` activa MSW v2 con handlers en `src/mocks/handlers/`
- Fixtures en `src/mocks/fixtures/` con ejemplos representativos
- Toggle a backend real con flag de env (drop-in)

---

## 9. Seguridad y accesibilidad

### Seguridad
- **CSP estricta** en `nginx.conf` (sin `unsafe-eval`)
- **Security headers**: HSTS, X-Content-Type-Options, X-Frame-Options DENY,
  Referrer-Policy, Permissions-Policy
- **Cookies HttpOnly + Secure + SameSite** para JWT/refresh
- **Sanitización markdown** con `rehype-sanitize`
- **Validación de protocolo** en URLs (no `javascript:` ni `data:` excepto images)
- **Sin recursos externos en runtime** (todo bundleado)
- **Audit en CI**: `npm audit --audit-level=high` + Trivy scan

### Accesibilidad (WCAG 2.1 AA)
- Foco visible
- `prefers-reduced-motion`
- Contraste auto-ajustable (`pickAccessibleTextColor`)
- ARIA en chat (`region`, `aria-live="polite"`)
- ARIA en KPIs streaming (throttle ≤1 anuncio/30s)
- Tabla de datos accesible bajo Recharts (sr-only)
- Touch targets ≥ 44 px
- Tests con axe-core

---

## 10. Observabilidad

| Categoría | Captura | Exporta |
|---|---|---|
| Errores | Excepciones, error boundaries, 5xx | Sentry-compat SDK → `SENTRY_DSN` |
| Métricas y traces | Core Web Vitals, API latency, navegación | OpenTelemetry browser → `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Audit | Login, descargas, acciones, cambios de preferencias | `POST /audit/event` |

**`TELEMETRY_ENABLED=false`** deshabilita exportación externa (modo
air-gapped). Audit interno sigue fluyendo.

**No-op si endpoints vacíos**: Sentry y OTel no añaden overhead si no
hay endpoint configurado.

### Logs JSON estructurados
```json
{
  "timestamp": "ISO 8601",
  "level": "error|warn|info",
  "category": "api|render|auth|sse|lifecycle",
  "event": "consulta_failed",
  "user_pseudo_id": "...",
  "tenant_id": "...",
  "client_version": "0.1.0",
  "context": { /* sin PII */ }
}
```

**Lo que NUNCA se reporta**: contenido de mensajes, valores de formularios,
JWT/credenciales, contenido de `/capabilities`, identidad en claro.

---

## 11. Build, despliegue y CI/CD

### Dockerfile multi-stage
```
node:20-alpine (build) → nginx:alpine (serve)
```
Imagen final ~20 MB con:
- CSP estricta
- Security headers
- Healthcheck (`GET /healthz` → `200 ok`)
- `entrypoint.sh` que materializa env vars en `/config.js`

### Bundle metrics
- **Inicial gzipped**: ~150 KB (entry + react + router + tanstack + i18n + zod)
- **OTel**: 39 KB en chunk separado
- **Sentry**: 25 KB en chunk separado
- **Recharts**: 107 KB solo carga con `serie_temporal`
- Cada artefacto: chunk lazy independiente

### CI/CD (`.github/workflows/ci.yml`)
1. Install + typecheck + lint + format check + test + build
2. `npm audit --audit-level=high`
3. Build imagen Docker
4. Smoke test contra `/healthz` y `/config.js`
5. Trivy scan (falla en CRITICAL/HIGH)
6. Push imagen versionada al registry

---

## 12. Diferencias entre el repo `producto-customer-ui` y nuestro prototipo Omelette

### Lo que el repo tiene y nuestro prototipo no
- TypeScript estricto en todo
- Tests reales (48 unit + integration + a11y)
- Cliente HTTP real con interceptor 401
- MSW para mockear el backend
- Recharts, TanStack Table reales (vs SVG hand-rolled)
- shadcn primitives copy-paste
- i18n con 3 idiomas
- Observabilidad real (Sentry + OTel)
- CSP estricta y security headers
- Docker multi-stage + CI/CD completo

### Lo que nuestro prototipo tiene y el repo no
- **Look & feel definido**: paleta navy/coral/cream/paper, tipografías
  Fraunces + Plus Jakarta Sans + JetBrains Mono
- **Decisiones visuales aprobadas**: TopBar limpia con toggles on/off
  (Última, Pendientes, KPI), banda de KPIs colapsable, sidebar
  contextual al chat, paneles laterales tipo Claude.ai
- **Reglas UX específicas**:
  - La pantalla arranca limpia
  - Sidebar solo en Chat
  - KPIs como números coloreados con expansión inline
  - Sidebar agrupa temáticas por semana (últimas 4)
  - Reportes "Reportes Gerencia X" con filtros habilitados/no habilitados
- **Footer "Powered by OPCiber"** en todas las páginas

---

## 13. Espacios abiertos (qué falta diseñar/especificar)

Identificados en `handoff-design.md` §4:

1. **Admin UI** (sibling product) — no existe spec aún
2. **Central V2** — contrato HTTP que la UI espera (sin esto, mocks
   indefinidamente)
3. **Módulo Reportes** — generación on-demand vs pre-generados, TTL de
   URLs firmadas, RBAC chunk-level, branding de PDFs/XLSX
4. **Módulo KPIs streaming** — catálogo de KPIs, fuente de eventos,
   persistencia histórica
5. **Módulo Acciones** — catálogo de acciones, retry/circuit breaker,
   webhooks
6. **Mobile native** (PWA, Capacitor) — fases 2 y 3 del spec
7. **RTL y nuevos idiomas** — árabe, hebreo
8. **Design tokens completos** — hoy hay 3 CSS vars; falta sistema de
   tokens semánticos con tipografías y escalas

---

## 14. Decisiones de implementación que conviene NO tocar

`handoff-design.md` §5.5 las marca explícitamente:

- **Discriminated unions con `tipo` literal** — cualquier artefacto nuevo sigue `{ tipo: "X", version: N, ... }`
- **`passthrough()` solo a nivel hijo, no root** de schemas response — para forward-compat sin romper TypeScript narrow
- **CSS vars en lugar de Tailwind theme custom** — necesario porque capabilities inyecta colores en runtime
- **Lazy load por artefacto** — mantiene bundle inicial bajo presupuesto

---

## 15. Cómo correr el repo (referencia rápida)

```bash
git clone https://github.com/Asistente-agentico/producto-customer-ui
cd producto-customer-ui
npm install
npm run dev   # http://localhost:5173, MSW activado
```

Acceso al repo: privado en la org `Asistente-agentico`.

**Palabras clave para disparar artefactos en el chat de la demo**:
- `mortalidad` → `serie_temporal` + `banner` causal
- `centros`, `biomasa`, `tabla` → `tabla`
- `kpi`, `resumen` → `tablero_kpi` con bloqueado
- `correo`, `accion` → `accion_propuesta`
- `cual`, `seleccionar` → `seleccion`
- `futuro`, `unknown` → artefacto desconocido (forward-compat)

Otras vistas:
- `/dashboard` — KPIs SSE en vivo (4s entre updates)
- `/reportes` — catálogo + descargas
- `/configuracion` — perfil, idioma, sistema

---

## 16. Documentos del repo (referencia)

| Archivo | Tamaño | Función |
|---|---|---|
| `README.md` | 6 KB | Guía operativa (dev, build, deploy) |
| `docs/spec.md` | 53 KB | Fuente de verdad del diseño (23 secciones) |
| `docs/plan.md` | 24 KB | Plan H0–H12, riesgos R1–R7, ambigüedades A1–A10 |
| `docs/handoff-design.md` | 16 KB | Brief para el iterador del diseño (este documento sintetiza el suyo) |

---

**Fin del documento.**

Generado a partir de lectura directa del repo `producto-customer-ui@main`
el 2026-05-14.
