# Handoff para el equipo de diseño (Claude Design)

> Brief para el iterador del diseño. Cuenta qué se construyó del customer UI
> a partir de [`docs/spec.md`](spec.md), qué decisiones se tomaron durante
> la implementación que ya no son ambigüedades, qué partes del spec
> conviene actualizar para reflejar lo construido, y qué espacios de diseño
> quedan abiertos para nuevas especificaciones.
>
> **Audiencia**: alguien que va a generar nuevas especificaciones (admin UI,
> evolución de la customer UI, contrato del central V2, módulos opcionales),
> partiendo de lo ya implementado.

---

## 1. Qué se implementó

La customer UI está construida end-to-end según [`docs/spec.md`](spec.md).
12 hitos (H0–H12) completados, 48 tests, CI verde, imagen Docker ~20 MB
cloud-agnóstica. Detalle en [`docs/plan.md`](plan.md) sección 10.

**Cobertura del spec**:

| Sección spec | Estado |
|---|---|
| §1 Arquitectura · 5 módulos | UI implementada; descubre opcionales vía `/capabilities` |
| §2 Stack | React 18 + TS 5 + Vite 5 + Tailwind 3 + shadcn primitives + Zustand + TanStack Query/Table + Recharts + RHF + Zod + react-i18next + MSW + Sentry-compat + OpenTelemetry browser |
| §3 Tenancy + Docker | Imagen multi-stage, `entrypoint.sh` materializa env vars en `config.js` |
| §4 Contrato HTTP | Cliente con interceptor de refresh 401, headers transversales, eventos globales (new_version_available, capabilities_version_changed, auth_lost), errores tipados `ApiError` |
| §5 Configuración 3 capas | Capa 1 (defaults), Capa 2 (`window.__APP_CONFIG__`), Capa 3 (`/capabilities`) con cascada |
| §6 Catálogo de artefactos | Los 10 artefactos del spec + `UnknownArtifactPlaceholder` para forward-compat. Dispatcher exhaustivo con discriminated union TS |
| §7 Auth + RBAC | `iam_interno` (form) e `idp_externo` (redirect OIDC). Pre-checks léxicos en sugerencias; backend es autoridad final |
| §8 Comunicación módulos | UI habla directo con cada módulo (central, kpis, reportes, acciones); URLs vienen de `capabilities.modulos.*.base_url` |
| §9 Estado de sesión | Zustand (in-memory) + localStorage (idioma, last conv id, caché capabilities) + cookies HttpOnly server-side |
| §10 i18n | es/en/pt bundleados; cascada localStorage → navigator → env → 'es'; switcher reaplica i18next + persiste server + re-fetch capabilities traducidas |
| §11 Mobile | Mobile-first, sidebar colapsable, touch targets ≥44px, scroll containers explícitos, `inputmode` en chat |
| §12 Observabilidad | Logger JSON estructurado siempre; Sentry-compat y OTel browser **no-op si endpoint vacío** (TELEMETRY_ENABLED toggle global) |
| §13 Versionado | `X-Client-Version`, banner de "nueva versión", caché de `/capabilities` con `X-Capabilities-Version` |
| §14 Seguridad navegador | CSP estricta en nginx, security headers, sanitización markdown con `rehype-sanitize`, validación de protocolo en URLs |
| §15 A11y | WCAG 2.1 AA: foco visible, `prefers-reduced-motion`, contraste auto-ajustable via helper, axe-core tests, ARIA en chat/charts/KPIs/forms/acciones |
| §16 Estructura repo | Coincide con la propuesta del spec |
| §17 Build/deploy | Dockerfile multi-stage, nginx con CSP, healthcheck, Trivy en CI |
| §18 Bootstrap lifecycle | `/auth/me` → `/capabilities` → aplica branding → carga preferencias + conversaciones + KPIs SSE |
| §19 Eventos | Todos implementados, plus `refrescarGraficoVentana` (ver §3 de este doc) |

---

## 2. Decisiones tomadas durante la implementación (ambigüedades resueltas)

Las 10 ambigüedades A1–A10 que dejé abiertas en [`plan.md`](plan.md) §6
quedaron resueltas con las recomendaciones del plan. **Si una decisión no
te convence, este es el lugar para revertirla en el próximo spec.**

| # | Ambigüedad | Decisión aplicada |
|---|---|---|
| A1 | Roles RBAC concretos | Dominio **genérico** en el código. Fixtures de **salmonera** en `src/mocks/fixtures/` solo para demo/tests. Ningún dominio hardcoded en la UI |
| A2 | Forma del IdP externo | OIDC **Authorization Code + PKCE** (el flow real lo maneja el backend; la UI solo hace redirect a `AUTH_IDP_URL`) |
| A3 | Refresh de gráfico sin LLM | **Endpoint agregado al contrato**: `POST /conversaciones/{id}/mensajes/{msg_id}/refresh-grafico` con body `{ ventana: string }`. Listado de ventanas viene en el propio artefacto `serie_temporal` |
| A4 | URLs firmadas para archivos grandes | **MinIO o reverse-proxy con token único** propuesto (cloud-agnóstico). Pendiente que el módulo de reportes decida. La UI consume `archivo_descargable.url` sin asumir proveedor |
| A5 | `X-Client-Version` con telemetría off | **Siempre se envía** (es contexto de auditoría, no telemetría externa) |
| A6 | TTL de cache `/capabilities` | **15 minutos** en `localStorage` + invalidación por `X-Capabilities-Version` |
| A7 | Modo degradado | Chat plano + sidebar oculta + banner persistente "configuración no disponible" + botón "reintentar" |
| A8 | Auto-rename del ámbito | **El central decide**; la UI refresca el título desde el response |
| A9 | Versión inicial | `0.1.0` (semver) — `package.json` y header `X-Client-Version` |
| A10 | Sentry SaaS vs self-hosted | **Sentry-compatible SDK** (`@sentry/browser`) — funciona contra Sentry SaaS, self-hosted o **GlitchTip self-hosted** (default sugerido para cloud-agnosticismo). La UI no asume cuál |

---

## 3. Cambios al contrato que el próximo spec debería reflejar

Estos son delta sobre [`docs/spec.md`](spec.md) que surgieron de la
implementación y conviene incorporar formalmente.

### 3.1 Endpoint nuevo: refresh de gráfico
`POST /conversaciones/{conversacion_id}/mensajes/{mensaje_id}/refresh-grafico`

**Request**: `{ "ventana": "7" | "30" | "90" | "ciclo" | string }`
**Response**: misma shape que `POST /conversaciones/{id}/mensajes` (un
`MensajeResponse` con el artefacto `serie_temporal` actualizado, sin LLM).

Mencionado de paso en §6.1 del spec pero no listado en §4.

### 3.2 Endpoint `GET /conversaciones/{id}` con historial
`GET /conversaciones/{id}` no está en §4.3 pero la UI lo necesita para
cargar el historial al navegar a una conversación.

**Response**:
```json
{
  "id": "conv_xyz",
  "titulo": "...",
  "asistente_id": "engorda",
  "creado_en": "ISO 8601",
  "actualizado_en": "ISO 8601",
  "mensajes": [
    { "rol": "user", "texto": "...", "ts": "ISO" },
    { "rol": "assistant", "ts": "ISO", "respuesta": { /* MensajeResponse */ } }
  ]
}
```

### 3.3 Estructura del `MensajeResponse`
El spec §4.3 muestra un response con campos top-level (`respuesta`,
`artefactos`, `metadata`, `blocked`, `error`). La implementación lo
preserva, **pero**:
- Sin `.passthrough()` a nivel root en el schema (causaba pérdida de
  narrow de TypeScript). Campos desconocidos a nivel root se descartan;
  pero **artefactos desconocidos sí se preservan** y caen a
  `UnknownArtifactPlaceholder`.
- Campos `chunks_used`, `scopes`, `ambiguous_routing` están dentro de
  `metadata: {...}` (no top-level). El spec ya lo dice en §4.3, este
  comentario es para evitar confusión con §6.4 que los menciona como
  "siempre presentes".

### 3.4 Formato de error uniforme
El spec §4.10 está bien definido. La implementación asume estrictamente
ese formato; cuando el backend devuelve `{ detail: string }` (estilo
FastAPI default), la UI lo envuelve sintéticamente. **El central V2
debe adoptar el formato del spec**.

### 3.5 Auditoría
`POST /audit/event` con body:
```json
{ "evento": "string", "recurso": "string?", "metadata": {}, "ts": "ISO 8601" }
```
La UI emite eventos `accion_confirmada`, `reporte_descargado`. El spec
§4.8 y §12.1 los menciona pero no especifica la shape — esto define el
contrato mínimo.

### 3.6 Toggle de mocks en deploy-time
Se agregó variable `USE_MOCKS` (Capa 2) que solo aplica en dev/staging
para que la UI corra contra MSW sin un central activo. **Documentar en
§5.2** como "solo dev" — no debe encenderse en prod.

---

## 4. Espacios abiertos para nuevas specs

Lugares donde el customer UI no tiene contrato cerrado y donde la próxima
ronda de diseño puede agregar valor.

### 4.1 Admin UI (sibling product)
El spec del customer UI dice explícitamente (§1.2, §22) que el admin UI
es producto hermano fuera del alcance. **No existe spec para el admin UI**.
La customer UI lo único que necesita es que el admin pueda:
- Editar `/capabilities.ui` (branding, asistentes, sugerencias).
- Trigger de refresh de `X-Capabilities-Version`.

Una spec de admin UI puede partir de esta dependencia mínima y agregar:
gestión de tenants, licencias por módulo opcional, audit log viewer,
batch jobs (ingesta del lakehouse), gestión de usuarios IAM interno,
configuración SAML/OIDC.

### 4.2 Central V2 — contrato HTTP
El central V1 (`sistema_rag` en `C:\Users\karin\sistema_rag`) **no
implementa el contrato del spec**. Falta:
- `GET /capabilities`
- `POST /auth/{login,refresh,logout}` + `GET /auth/me` con cookies HttpOnly
- `GET|POST|DELETE /conversaciones/*` (persistidas server-side)
- `POST /accion`
- `POST /audit/event`
- `GET|PUT /usuario/preferencias`
- Formato de error `{error:{code,message,details}}`
- Logs JSON estructurados
- Desacople de GCP (BigQuery → store abstracto; Vertex AI → embeddings
  abstractos; Cloud Run → Docker plano)

Una spec del **central V2** debería definir ese contrato y la migración
desde el V1.

### 4.3 Módulo de Reportes
La UI consume `GET /catalogo` y `GET /{report_id}`. Falta diseñar:
- Generación on-demand vs pre-generados.
- TTL de URLs firmadas (sec. §6.3 del spec menciona 60s).
- Cómo se decide qué reportes ve cada usuario (RBAC chunk-level extendido a reportes).
- Formato de los reportes (PDF/XLSX templates, branding del tenant).

### 4.4 Módulo de KPIs streaming
Contrato SSE definido en §4.7 del spec. Espacios abiertos:
- Cómo se publican métricas al stream (event source: batch jobs del
  central, agentes externos, edge sensors).
- Catálogo de KPIs disponibles vs configurables por tenant.
- Persistencia histórica (¿es responsabilidad del módulo KPIs o del
  central?).

### 4.5 Módulo de Acciones
Contrato `POST /accion` está claro. Espacios abiertos:
- Catálogo de acciones soportadas (`ENVIAR_CORREO`, `ENVIAR_WHATSAPP`,
  `LLAMAR_AGENTE_IA`, otras).
- Política de retry/circuit breaker para integraciones externas.
- Webhooks de confirmación asíncrona.

### 4.6 Mobile native (Fases 2 y 3 del §11.1)
El spec menciona PWA (manifest + service worker) y wrapper Capacitor
para apps nativas como fases futuras. Cuando un cliente lo pida.

### 4.7 RTL y nuevos idiomas
El spec §10.5 dice "RTL futuro". Si se suma árabe/hebreo, hay que
diseñar el toggle, el comportamiento de iconos direccionales, y el
testing.

### 4.8 Pixel-perfect del branding
La UI implementa branding mínimo: 3 CSS vars (primario, sidebar,
acento) + logo + favicon + emoji opcional. No hay sistema de design
tokens completo. Una spec de "design system del producto" podría:
- Definir tokens semánticos (success, danger, neutral, etc.) que
  capabilities pueda override.
- Definir tipografías que el tenant pueda cambiar (hoy es solo
  `system-ui`).
- Definir escalas de spacing/radius/elevation que respondan al branding.

---

## 5. Información práctica para el iterador

### 5.1 Cómo correr el repo

```bash
git clone https://github.com/Asistente-agentico/producto-customer-ui
cd producto-customer-ui
npm install
npm run dev   # http://localhost:5173, MSW activado por defecto
```

Acceso al repo: privado en la org `Asistente-agentico`. Pedirle a
`ksteembecker` invitación si no estás autenticada.

### 5.2 Cómo ver cada artefacto del spec en vivo
Con la app corriendo, en el chat escribí palabras clave para disparar
el fixture correspondiente:

| Palabra | Artefacto |
|---|---|
| `mortalidad` | `serie_temporal` + `banner` causal |
| `centros`, `biomasa`, `tabla` | `tabla` |
| `kpi`, `resumen` | `tablero_kpi` con KPI bloqueado |
| `correo`, `accion` | `accion_propuesta` con confirmación de riesgo |
| `cual`, `seleccionar` | `seleccion` |
| `futuro`, `unknown` | artefacto desconocido (forward-compat) |

Otras vistas:
- `/dashboard` — KPIs SSE en vivo (4s entre updates)
- `/reportes` — catálogo + descargas
- `/configuracion` — perfil, idioma, sistema

### 5.3 Cómo verificar conformidad con el spec
- **Contrato HTTP**: ver `src/api/types.ts` (Zod schemas). Toda
  respuesta del backend pasa por `safeParse`. El spec §4 debe coincidir
  campo por campo con esos schemas.
- **Artefactos**: ver `src/artifacts/`. Cada uno tiene su schema en
  `types.ts` y se enumera en `KnownArtefactoSchema = z.discriminatedUnion`.
- **Capabilities**: ver `src/mocks/fixtures/capabilities.ts` para un
  ejemplo completo del shape §4.2.
- **Bootstrap lifecycle**: `src/app/ProtectedRoute.tsx` y `src/main.tsx`
  implementan los 6 pasos de §18.

### 5.4 Cómo proponer cambios al spec
1. Editar `docs/spec.md` directamente.
2. Si el cambio requiere implementación, abrir issue describiendo
   delta y referenciando la sección.
3. Si el cambio invalida una decisión de §2 de este doc, marcarlo
   explícitamente — esos lugares son los que más fricción tienen.

### 5.5 Decisiones de implementación que conviene NO tocar
Estas son decisiones tomadas por razones técnicas que el diseñador no
debería invertir sin coordinar con el dev:

- **Discriminated unions con `tipo` literal**: cualquier artefacto nuevo
  debe seguir la convención `{ tipo: "X", version: N, ... }`.
- **`passthrough()` solo a nivel hijo, no root** de schemas de respuesta:
  permite forward-compat sin romper narrow de TypeScript.
- **CSS vars en lugar de Tailwind theme custom**: porque capabilities
  inyecta colores en runtime; no puede hacerlo si están en
  `tailwind.config.ts` build-time.
- **Lazy load por artefacto**: mantiene el bundle inicial bajo
  presupuesto (250 KB gzipped). Cualquier artefacto nuevo debe seguir
  ese patrón (`React.lazy` + `Suspense` fallback).

---

## 6. Apéndice — Mapa de archivos clave

```
docs/
├── spec.md              # fuente de verdad del diseño (sin cambios respecto al original)
├── plan.md              # plan H0-H12, métricas, riesgos R1-R7
└── handoff-design.md    # este documento

src/
├── api/types.ts                       # Zod schemas: artefactos, Capabilities, MensajeResponse, errores
├── api/client.ts                      # fetch wrapper + interceptor refresh + eventos globales
├── api/{auth,capabilities,conversaciones,kpis-sse,reportes,usuario,audit}.ts
├── app/{routes,AppLayout,TopBar,Sidebar,ProtectedRoute,VersionBanner}.tsx
├── artifacts/ArtefactDispatcher.tsx   # switch exhaustivo con discriminated union
├── artifacts/{Banner,SerieTemporal,Tabla,TableroKpi,Imagen,Progreso,
│              AccionPropuesta,ArchivoDescargable,Formulario,Seleccion,
│              UnknownArtifactPlaceholder,TextoMarkdown}.tsx
├── features/{chat,kpis,reportes,configuracion,auth,conversaciones}/
├── stores/{auth,capabilities,conversaciones,kpis}.ts   # Zustand stores
├── i18n/{index,locales/{es,en,pt}.json}
├── lib/{config,query-client,a11y}.ts  # config runtime, TanStack Query, contraste WCAG
├── mocks/                              # MSW v2: handlers + fixtures por endpoint
├── observability/{logger,sentry,otel}.ts
└── test/{setup,axe}.ts

docker/{Dockerfile,nginx.conf,entrypoint.sh}
.github/workflows/ci.yml                # typecheck, lint, test, build, audit, docker, Trivy
```

---

**Última actualización**: handoff generado tras commitear H0–H12.
Fecha del commit base: 2026-05-14.
