# Plan de implementación — Customer UI

> Plan derivado del [spec](spec.md). Sujeto a revisión y aprobación antes
> de iniciar implementación.

## 0. Contexto y restricciones

- **Fuente de verdad**: [`docs/spec.md`](spec.md) (sección por sección).
  Cualquier ajuste durante implementación se commitea ahí.
- **Cloud-agnóstica**: no se admite ninguna dependencia hardcoded a un
  proveedor (CDNs externos, BaaS, SaaS-only). Todo viaja dentro de la
  imagen Docker.
- **Sin tocar el módulo central**: el repo `sistema_rag` es read-only para
  esta UI. Sólo se lee para entender convenciones.
- **Integración con central V1**: el central actual (`sistema_rag`) NO
  implementa el contrato HTTP descrito en el spec (falta `/capabilities`,
  `/conversaciones/{id}`, `/auth/*`, JWT en cookies HttpOnly, formato
  uniforme de errores, etc.) y está acoplado a GCP. La integración real
  depende de un sprint posterior de evolución del backend (ver Riesgo R1).
  Durante la implementación de la UI se trabaja contra **MSW (Mock Service
  Worker)** con mocks que reflejan 1:1 el contrato del spec.

## 1. Convenciones adoptadas del módulo central

Tras revisar `C:\Users\karin\sistema_rag\` (FastAPI + Pydantic), la UI
mantendrá coherencia en:

| Convención | Adoptamos | Notas / desviación |
|---|---|---|
| `snake_case` en campos JSON | Sí | Ya en el spec |
| Timestamps ISO 8601 con TZ | Sí | El central usa `datetime.now()`; en el contrato del spec serializamos siempre con `Z`/offset explícito |
| Idioma de campos (español neutro) | Sí | `consulta`, `respuesta`, `usuario_id`, `chunks_used`, `scopes`, `causal_context`, `ambiguous_routing` ya están en `ConsultaResponse` del central |
| Pydantic-style validation en boundary | Sí (con Zod en el frontend) | Mismas reglas de `min_length`, etc. |
| Dominio configurable | Sí | El central usa `config/domain*.yaml` (genérico, portuario, salmonero). La UI lo recibe vía `/capabilities.ui` y nunca lo hardcodea |
| Formato de errores `{error:{code,message,details}}` | Sí | **Desviación deliberada del central**: el central actual usa `HTTPException(detail: str)`. El customer UI se implementa contra el formato del spec; el central deberá adoptarlo en el sprint de actualización |
| Logs JSON estructurados (sección 12.4) | Sí | **Desviación deliberada**: el central actual loguea texto plano. La UI loguea JSON desde el día 1 |
| Cookies HttpOnly + JWT | Sí | **Desviación deliberada**: el central no tiene auth; la UI espera el contrato del spec |

## 2. Estrategia de mocks (MSW)

- Usamos `msw` v2+ con handlers en `src/mocks/handlers/`.
- Estructura de carpetas espejo del contrato HTTP:
  - `mocks/handlers/auth.ts`
  - `mocks/handlers/capabilities.ts`
  - `mocks/handlers/conversaciones.ts`
  - `mocks/handlers/kpis-sse.ts` (con `ReadableStream` simulando SSE)
  - `mocks/handlers/acciones.ts`
  - `mocks/handlers/reportes.ts`
  - `mocks/handlers/audit.ts`
- Fixtures en `mocks/fixtures/` con ejemplos representativos de cada
  artefacto (sección 6 del spec) y respuestas completas.
- MSW se activa en dev (`vite dev`) cuando `VITE_USE_MOCKS=true`.
- Toggle a backend real con flag de env. **Drop-in**: las mocks deben
  cumplir el contrato del spec exactamente — cuando el central se
  actualice, basta apagar el flag.
- Los tests unitarios y de integración usan MSW node server.

## 3. Fases de implementación

> Sigo aproximadamente la sección 21 del spec, pero con ajustes para
> resolver dependencias antes (mocks → auth → capabilities → resto).

### Fase 0 — Bootstrap del proyecto (1–2 días)

- Scaffold Vite + React 18 + TS estricto.
- Configurar Tailwind 3, ESLint, Prettier, tsconfig con `strict: true`.
- Configurar `tailwind.config.ts` con CSS vars (`--color-primary`,
  `--color-sidebar`, `--color-accent`) leídas desde
  `window.__APP_CONFIG__` y `/capabilities`.
- shadcn/ui (componentes copy-paste mínimos: Button, Input, Card, Dialog,
  DropdownMenu, Tooltip).
- React Router v6, Zustand, TanStack Query, react-i18next instalados.
- Dockerfile multi-stage (`node:20-alpine` build + `nginx:alpine` serve).
- `entrypoint.sh` que materializa env vars en `/usr/share/nginx/html/config.js`.
- `nginx.conf` con CSP, security headers, fallback SPA, CORS dev.
- `.env.example` con todas las variables de Capa 2.
- CI inicial: GitHub Actions con build + typecheck + lint.

**Hito**: imagen Docker arranca, muestra `Hello`, sirve `config.js`
generado desde env vars, CSP activa. Verificable con
`docker run --env-file .env.example -p 8080:8080 producto-customer-ui:dev`.

### Fase 1 — Infraestructura de UI (2–3 días)

- `src/api/client.ts` — fetch wrapper con `credentials: 'include'` y
  interceptor de refresh 401 (sección 20.1).
- `src/api/types.ts` — discriminated unions de TODOS los artefactos
  (sección 6) y de `Capabilities`, `Conversacion`, `MensajeResponse`.
  Tipos derivados de Zod schemas para validar runtime.
- `src/observability/` — Sentry SDK (no-op si `SENTRY_DSN` vacío),
  OpenTelemetry browser SDK (no-op si `OTEL_EXPORTER_OTLP_ENDPOINT`
  vacío). Logger JSON estructurado (sección 12.4).
- `src/lib/config.ts` — lee `window.__APP_CONFIG__` con fallbacks.
- MSW configurado (sección 2 de este plan) con handlers para `/auth/me`,
  `/capabilities`, error responses uniformes.
- i18n inicial: `es.json`, `en.json`, `pt.json` con strings core (botones,
  errores, navegación). Cascada de detección (sección 10.2).
- Tests unitarios para `client.ts` (refresh, error mapping) e i18n.

**Hito**: `npm run dev` arranca, fetch al mock `/auth/me` funciona,
interceptor 401 dispara `/auth/refresh`. Toggle de idioma cambia strings.

### Fase 2 — Auth + Capabilities + Layout (2–3 días)

- `src/api/auth.ts` y `src/features/auth/` — flujo `iam_interno`
  (formulario login) y `idp_externo` (redirect a `AUTH_IDP_URL`). Logout.
- `src/api/capabilities.ts` + `src/stores/capabilities.ts` — Zustand
  store con caché, refetch cuando llega `X-Capabilities-Version` distinto.
- Aplicar capabilities a CSS vars, title, favicon (sección 20.2).
- Modo degradado si `/capabilities` falla (banner + chat básico).
- Layout: TopBar (logo, título, idioma, perfil), Sidebar colapsable
  (asistentes filtrados por `rol`/`permisos`), área principal.
- Routing: `/login`, `/chat`, `/chat/:conversacionId`, `/dashboard`,
  `/reportes`, `/configuracion`.

**Hito**: login mock → bootstrap → capabilities cargan → layout pintado
con branding del tenant. Logout funciona. Refresh transparente.

### Fase 3 — Chat + dispatcher de artefactos (4–5 días)

- `src/features/chat/` — vista principal: lista de mensajes (rol
  `region`, `aria-live="polite"`), textarea con scroll interno, botón
  enviar, sugerencias precargadas filtradas por ámbito.
- `src/artifacts/ArtefactDispatcher.tsx` — discriminated union switch
  exhaustivo + lazy load por artefacto (sección 6.5).
- Componentes de artefacto (orden de prioridad):
  1. `TextoMarkdown` (markdown + `rehype-sanitize`).
  2. `BannerCard` (variantes info/warning/error/success/causal/mantenimiento).
  3. `SerieTemporalCard` (Recharts, switcher de ventana, refresh sin LLM).
  4. `TablaCard` (TanStack Table).
  5. `TableroKpiCard`.
  6. `ImagenCard`.
  7. `ProgresoCard`.
  8. `AccionPropuestaCard` (placeholder hasta Fase 6).
  9. `ArchivoDescargableCard` (placeholder hasta Fase 7).
  10. `FormularioCard` (React Hook Form + Zod schema dinámico).
  11. `SeleccionCard`.
  12. `UnknownArtifactPlaceholder` (forward-compat).
- Pildorita colapsable con `chunks_used`, `scopes`, `permisos_aplicados`.
- Hints: plantilla con `grafico_rule_id` y `ventana_dias` envía hint en
  request.
- Mocks de MSW para `/conversaciones/{id}/mensajes` con cada tipo de
  artefacto.

**Hito**: enviar un mensaje "Mortalidad última semana en CTR-001"
dispara mock que devuelve respuesta + `serie_temporal` + `banner causal`,
renderizados correctamente. Switcher de ventana en gráfico recalcula.

### Fase 4 — Conversaciones persistidas (2 días)

- `src/features/conversaciones/` — lista en sidebar, crear, eliminar,
  cargar al cambiar `conversacionId` en URL.
- Auto-rename del ámbito al primer mensaje (flag de capabilities).
- Estado: TanStack Query con cache invalidation tras `POST`/`DELETE`.
- Persistencia de `lastConversacionId` en `localStorage`.

**Hito**: refrescar página retoma la última conversación. Crear/borrar
funciona. Lista paginada.

### Fase 5 — KPIs streaming via SSE (2 días)

- `src/api/kpis-sse.ts` con `@microsoft/fetch-event-source`
  (sección 20.3). Header `Authorization` cross-origin, cookies
  same-origin. Soporte `Last-Event-ID`.
- `src/features/kpis/` — dashboard con `TableroKpiCard` actualizable en
  vivo. Throttle de anuncios `aria-live` a ≤1/30s (sección 15.4).
- Mock MSW de SSE con `ReadableStream` que emite `kpi_update` cada N s.

**Hito**: dashboard de KPIs muestra valores en tiempo real desde mock
SSE. Reconexión tras desconexión simulada funciona.

### Fase 6 — Acciones (human-in-the-loop) (2 días)

- `src/features/acciones/` — `AccionPropuestaCard` con tres niveles de
  fricción (bajo / medio / alto) según `riesgo` (sección 6.3).
- Editor de parámetros (campos en `permite_edicion`).
- `POST /accion` tras confirmación + `POST /audit/event`.
- Estado pendiente en Zustand (no se pierde al navegar).

**Hito**: enviar mensaje → recibir `accion_propuesta` → editar →
confirmar → mock registra acción y devuelve resultado → UI muestra
confirmación.

### Fase 7 — Reportes + descargas (1–2 días)

- `src/features/reportes/` — catálogo (`GET /reportes/catalogo`) +
  descarga directa.
- `ArchivoDescargableCard` con dos modos: `base64_inline` (Blob →
  URL.createObjectURL → `<a download>`) y `url_firmada` (link directo).
- Validación de protocolo y mime type (sección 14.3).

**Hito**: descargar reporte mock (PDF y XLSX), descargar artefacto inline
desde una respuesta de chat.

### Fase 8 — Preferencias + perfil (1 día)

- `src/api/usuario.ts` — GET/PUT `/usuario/preferencias`.
- Menú de perfil con switcher de idioma (sección 10.6), preferencias de
  notificaciones, "Acerca de" con versión de la UI.
- Banner de "nueva versión disponible" cuando difiere `X-Latest-Client-Version`.

**Hito**: cambiar idioma persiste server-side y re-fetcha capabilities en
nuevo idioma.

### Fase 9 — Mobile + responsive polish (2 días)

- Breakpoints, sidebar hamburguesa, tablas adaptativas (sección 11.3).
- Touch targets ≥ 44 px, `inputmode` por campo.
- Scroll containers explícitos para mantener textarea visible.
- Test en viewport sm/md/lg con Playwright.

**Hito**: flujos golden path funcionan en mobile (375×812), tablet
(768×1024), desktop (1280×800).

### Fase 10 — Accesibilidad (sección 15) (2 días)

- Pasada con `axe-core` en componentes críticos.
- ARIA en chat bubbles, KPI dashboard, formularios, modales.
- Foco visible, `prefers-reduced-motion`, contraste auto-ajustado.
- Tabla de datos accesible bajo Recharts (sr-only).

**Hito**: `jest-axe` + Playwright + axe pasan sin violations en flujos
principales. Test manual con NVDA documentado en `docs/a11y-checklist.md`.

### Fase 11 — Tests + CI/CD endurecido (2 días)

- Cobertura objetivo: ≥70% unitario en `api/`, `artifacts/`, `lib/`.
- Tests de integración por feature (MSW).
- Tests e2e Playwright: login → chat → enviar → ver artefactos → acción
  → descarga → logout.
- CI: build, typecheck, lint, test, axe, `npm audit` (fail high/critical),
  Trivy scan de la imagen Docker, push a registry con tag semver.

**Hito**: pipeline verde y publica imagen `producto-customer-ui:0.1.0`.

### Fase 12 — Hardening + docs finales (1–2 días)

- CSP estricto sin `unsafe-eval`, validar con report-only en staging.
- Headers de seguridad verificados con securityheaders.com (o equivalente
  offline si air-gapped).
- README operativo, runbook de deploy, sección "Cómo conectar al central
  real cuando esté listo".
- Smoke test contra una primera versión del central actualizado (si
  está disponible).

**Hito**: imagen pasa scan Trivy sin highs, CSP no rompe nada, docs
operativos completos.

## 4. Hitos verificables consolidados

| # | Hito | Cómo se demuestra |
|---|------|-------------------|
| H0 | Imagen Docker arranca | `docker run` muestra UI vacía + `config.js` |
| H1 | Stack base completo | `npm run dev` + i18n + interceptor 401 funcionando |
| H2 | Auth + capabilities + layout | Bootstrap completo con branding del tenant |
| H3 | Chat con artefactos | Respuesta con `serie_temporal` + `banner` renderizada |
| H4 | Conversaciones persistidas | Recuperar conversación al refrescar |
| H5 | KPIs SSE | Dashboard live con mock SSE |
| H6 | Acciones | Acción propuesta confirmada y auditada |
| H7 | Reportes | Descarga de PDF/XLSX funcional |
| H8 | Preferencias | Switcher de idioma persistido |
| H9 | Mobile | Golden path en sm/md/lg |
| H10 | A11y | Axe sin violations |
| H11 | CI/CD | Imagen versionada en registry |
| H12 | Hardening | CSP estricto sin warnings + docs operativos |

## 5. Riesgos detectados

### R1 — Central V1 no cumple el contrato del spec (ALTO)

**Síntoma**: `sistema_rag` actual tiene `/consulta` simple (sin
conversación persistida, sin auth, sin `/capabilities`, errores como
`HTTPException(detail)` no como `{error:{code,message,details}}`) y está
acoplado a GCP (BigQuery, Vertex AI, Cloud Run, Qdrant). El customer UI
no puede integrarse drop-in con esa versión.

**Impacto**: la UI se ship con MSW por defecto en dev; integración real
contra central queda como dependencia bloqueada hasta sprint posterior
de evolución del backend (extensión del contrato + desacople de GCP).

**Mitigación**:
- Toda la UI se desarrolla contra mocks MSW que reflejan 1:1 el
  contrato del spec (secciones 4 y 6).
- Cuando exista el central V2, el switch es un flag de env
  (`VITE_USE_MOCKS=false`) y un cambio de `BACKEND_URL_CENTRAL`.
- Smoke tests contra una primera versión del central V2 en Fase 12.

### R2 — Branding por tenant puede romper contraste WCAG (MEDIO)

**Síntoma**: si admin UI ingresa colores que no cumplen 4.5:1 con el
texto, la customer UI debe auto-ajustar (sección 15.3) o degradar.

**Mitigación**: helper `pickAccessibleTextColor(bg)` que toma color de
fondo y elige `text-white` o `text-black` según luminancia. Warning a
Sentry si el branding propio del tenant produce ratio < 4.5.

### R3 — SSE entre dominios (MEDIO)

**Síntoma**: `EventSource` nativo no permite headers custom; cookies
HttpOnly cross-origin requieren `SameSite=None; Secure` + CORS con
credentials.

**Mitigación**: usar `@microsoft/fetch-event-source` con
`Authorization` header en cross-origin; documentar trade-off en README;
elegir same-origin proxy cuando sea posible (sección 14.2).

### R4 — Bundle size con artefactos lazy (BAJO)

**Síntoma**: Recharts, TanStack Table, React Hook Form pueden inflar
bundle inicial si no se code-splittea.

**Mitigación**: cada artefacto es `React.lazy` (ya en spec 6.5).
Verificar con `vite-bundle-visualizer` que initial ≤ 250 KB gzipped.

### R5 — CSP estricta vs librerías que necesitan `unsafe-eval` (BAJO)

**Síntoma**: algunos validators / runtime type checkers de Zod o
TanStack Query pueden requerir eval en modo dev.

**Mitigación**: CSP relajada en dev, estricta en prod build (sección
14.1). Tests en build de producción.

### R6 — i18n para dominios distintos (BAJO)

**Síntoma**: el central tiene `domain_salmon.yaml`, `domain.yaml`
(portuario), y otros futuros. Strings de UI core son agnósticos, pero
ejemplos / sugerencias precargadas vienen de capabilities por tenant.

**Mitigación**: ningún string específico de dominio se hardcodea. Si una
clave de i18n queda vacía, mostrar fallback claro (no string vacío).

### R7 — Deriva entre mock MSW y central real (MEDIO)

**Síntoma**: si el central V2 se desvía mínimamente del spec, los mocks
no detectan la divergencia.

**Mitigación**: los handlers de MSW validan inputs contra los mismos
Zod schemas que la UI consume. CI tiene un test "contrato" que verifica
las shapes contra el spec. Cuando se integre el central real, agregar
test e2e que valide payloads reales contra los mismos schemas.

## 6. Ambigüedades a resolver antes de empezar

> Estas son contradicciones o gaps detectados al leer el spec y comparar
> con el central. Las marco para resolver contigo **antes** de empezar
> Fase 0.

### A1 — Roles RBAC concretos

El spec ejemplifica con `jefe_centro` (salmonera). El central tiene en
README `operador_muelle`, `supervisor_turno`, `gerente_portuario`. El
dominio activo lo configura el central. **Pregunta**: ¿la primera
iteración de la UI debe asumir dominio salmonera (igual que ejemplos del
spec), o dominio genérico (sin ejemplos hardcoded)? Voto por **genérico
+ fixtures con salmonera** para mocks.

### A2 — Forma exacta del `idp_externo`

El spec dice que `iam_interno` es POST con form y `idp_externo` redirige
a `AUTH_IDP_URL`. **Pregunta**: ¿OIDC Authorization Code con PKCE, o
simplemente redirect-back con cookie? El central no implementa ninguno
aún. Voto por **OIDC Auth Code + PKCE** porque es estándar y compatible
con Keycloak/Entra/Okta/Auth0.

### A3 — Refresh de `serie_temporal` sin LLM

Spec sección 6.1 dice: "llama `POST /conversaciones/{id}/mensajes/{msg_id}/refresh-grafico`
(no llama al LLM, solo recalcula puntos para la ventana nueva)".

**Pregunta**: ese endpoint no está listado en sección 4. ¿Se agrega al
contrato o se sustituye por re-prompt al LLM con hint distinto? Voto
por **agregarlo al contrato** (más barato y rápido) y reflejarlo en el
spec.

### A4 — `URL firmada` para descargas grandes

Spec 6.3 menciona `url_firmada` para archivos grandes con TTL ~60s.

**Pregunta**: si la solución debe ser cloud-agnóstica, ¿quién emite la
URL firmada? Las pre-signed URLs son típicamente de S3/GCS. ¿El central
las emite y stream-pipea, o ya asumimos un object storage (cloud-agnóstico:
MinIO)? Voto por **MinIO o reverse-proxy con token de un solo uso**.

### A5 — Telemetry OTel cuando `TELEMETRY_ENABLED=false`

Spec 12.2 dice que `audit/event` sigue fluyendo aún con telemetría
deshabilitada. **Pregunta**: ¿qué pasa con el `client_version` en
auditoría? Voto por **mantener `X-Client-Version` siempre** (no es
telemetría externa, es contexto de auditoría).

### A6 — Caducidad de cache de `/capabilities`

Spec 9.1 dice "caché de `/capabilities` con TTL" en `localStorage`. No
especifica TTL. **Pregunta**: ¿15 min, 1 h, 24 h? Voto por **15 min**
(coincide con polling sugerido en 18.6) + invalidación por header
`X-Capabilities-Version`.

### A7 — Modo degradado: ¿qué endpoints siguen vivos?

Spec 4.2 dice "si `/capabilities` falla → modo degradado: solo chat
básico contra el central". **Pregunta**: en ese modo, ¿qué shape tiene
la UI sin saber rol/permisos/asistentes? Voto por: **chat plano,
sidebar oculta, sin sugerencias, banner persistente "configuración no
disponible"**.

### A8 — Renaming auto del ámbito al primer mensaje

Spec 4.2 `flags.autorenombrar_ambito_al_primer_mensaje: true`.
**Pregunta**: ¿el renaming lo hace la UI (heurística local) o el central
(devuelve el nuevo título)? Voto por: **el central decide** — la UI
solo refresca el título desde la respuesta.

### A9 — Versión inicial del producto

`package.json` empieza en `0.1.0` o `1.0.0`? Voto por **`0.1.0`**
hasta el primer release a cliente.

### A10 — Sentry self-hosted vs SaaS

Spec 12.1 dice "Sentry SaaS, self-hosted o GlitchTip". **Pregunta**: ¿hay
preferencia? Si no, **uso GlitchTip self-hosted** por defecto (cloud-agnóstica,
free, compatible).

## 7. Estimación gruesa de esfuerzo

| Fase | Días estimados | Acumulado |
|------|----------------|-----------|
| 0 — Bootstrap | 1–2 | 2 |
| 1 — Infraestructura UI | 2–3 | 5 |
| 2 — Auth + capabilities + layout | 2–3 | 8 |
| 3 — Chat + artefactos | 4–5 | 13 |
| 4 — Conversaciones | 2 | 15 |
| 5 — KPIs SSE | 2 | 17 |
| 6 — Acciones | 2 | 19 |
| 7 — Reportes | 1–2 | 21 |
| 8 — Preferencias | 1 | 22 |
| 9 — Mobile polish | 2 | 24 |
| 10 — A11y | 2 | 26 |
| 11 — Tests + CI/CD | 2 | 28 |
| 12 — Hardening + docs | 1–2 | 30 |

**Total**: ~5 a 6 semanas de un developer full-time. Variabilidad ±20%
según resolución de las ambigüedades.

## 8. Definición de "hecho" para cada feature

Una feature se considera completa cuando:

- Componentes con tipos estrictos (sin `any`, sin `as` excepto narrowing
  controlado).
- Cobertura unitaria ≥70% en lógica no-trivial.
- Test de integración con MSW que cubre golden path + 1 error path.
- Lint y typecheck verdes.
- A11y check de `axe` sin violations en el componente.
- Strings traducibles en `es`, `en`, `pt`.
- Funciona en mobile 375 px.
- Documentado en línea con comentarios solo donde el "porqué" no es
  obvio.

## 9. Política de commits y branches

- Branch principal: `main`.
- Feature branches: `feat/fase-N-descripcion-corta`.
- Commits convencionales: `feat:`, `fix:`, `chore:`, `docs:`, `test:`,
  `refactor:`, `perf:`.
- PR requiere: build verde, tests pasando, revisión humana antes de
  merge (incluso para mí — pondré asignación a la usuaria).
- Tags semver con cada release: `v0.1.0`, `v0.2.0`, etc.

## 10. Estado actual

- [x] Repo `Asistente-agentico/producto-customer-ui` creado en GitHub.
- [x] `docs/spec.md` versionado.
- [x] `docs/plan.md` redactado (este documento).
- [ ] **Plan revisado y aprobado** (esperando feedback).
- [ ] Ambigüedades A1–A10 resueltas.
- [ ] Fase 0 iniciada.

---

**Pendiente de aprobación antes de iniciar Fase 0.**
