# producto-customer-ui

Interfaz de usuario customer-facing del producto comercial. Aplicación web
responsiva (chat + dashboards + acciones) que consume el módulo central
(RAG batch) y los módulos opcionales (Reportes, KPIs streaming, Acciones).

> Producto distinto del **admin UI** y del **módulo central**. Este repo
> solo cubre la customer UI.

## Documentación

- [`docs/spec.md`](docs/spec.md) — fuente de verdad del diseño.
- [`docs/plan.md`](docs/plan.md) — plan de implementación con hitos H0–H12.

## Stack

| Capa | Elección |
|---|---|
| Framework | React 18 + TypeScript 5 estricto |
| Build | Vite 5 |
| Estilos | Tailwind 3 + CSS vars desde `/capabilities` |
| Estado | Zustand (con persist) + TanStack Query |
| Routing | React Router v6 (lazy + Suspense) |
| Gráficos | Recharts · Tablas: TanStack Table · Forms: RHF + Zod |
| i18n | react-i18next (es, en, pt) |
| SSE | `@microsoft/fetch-event-source` |
| Observabilidad | Sentry-compatible SDK + OpenTelemetry browser |
| Mocks | MSW v2 (dev y tests) |
| Tests | Vitest + Testing Library + axe-core |
| Imagen | `node:20-alpine` (build) + `nginx:alpine` (serve) |

## Desarrollo local

```bash
npm install
npm run dev                # http://localhost:5173 (MSW activado)
npm test                   # vitest + axe + integración
npm run typecheck          # tsc -b
npm run lint               # eslint
npm run format:check       # prettier --check
npm run build              # tsc + vite build → dist/
```

El flag `USE_MOCKS=true` (default en dev vía `public/config.js`) hace que la
UI use MSW en lugar de pegar al backend real. En producción, `entrypoint.sh`
regenera `config.js` a partir de las env vars del contenedor con
`USE_MOCKS=false`.

## Variables de entorno (Capa 2 — deploy-time)

| Variable | Default | Función |
|---|---|---|
| `BACKEND_URL_CENTRAL` | `http://central:8080` | URL del módulo central |
| `AUTH_MODE` | `iam_interno` | `idp_externo` o `iam_interno` |
| `AUTH_IDP_URL` | (vacío) | URL del IdP si `AUTH_MODE=idp_externo` |
| `IDIOMA_DEFAULT` | `es` | `es`, `en` o `pt` |
| `TENANT_ID` | (vacío) | Solo dedicated; multi-tenant lo infiere del JWT |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (vacío) | URL del colector OTLP; vacío deshabilita métricas |
| `SENTRY_DSN` | (vacío) | DSN para errores; vacío redirige a `console.error` |
| `TELEMETRY_ENABLED` | `true` | Toggle global de telemetría externa |
| `USE_MOCKS` | `false` | Solo dev: usa MSW si `true` |

`.env.example` tiene la lista completa.

## Construcción y despliegue Docker

```bash
docker build -f docker/Dockerfile -t producto-customer-ui:0.1.0 \
  --build-arg VERSION=0.1.0 .

docker run --rm -p 8080:8080 \
  -e BACKEND_URL_CENTRAL=https://api.tenant.com \
  -e AUTH_MODE=idp_externo \
  -e AUTH_IDP_URL=https://idp.tenant.com/realms/x/protocol/openid-connect/auth \
  -e SENTRY_DSN=https://... \
  producto-customer-ui:0.1.0
```

La imagen final es ~20 MB. nginx sirve la SPA con CSP estricta, security
headers y healthcheck (`GET /healthz` → `200 ok`).

## Cómo conectar al central real

La UI se desarrolla y testea contra MSW que refleja 1:1 el contrato del spec
([`docs/spec.md`](docs/spec.md) sección 4). Para integrar contra el módulo
central real:

1. **Verificar** que el central V2 implementa: `GET /capabilities`,
   `/auth/{login,refresh,logout,me}`, `/conversaciones/*`,
   `/audit/event`, `/accion`, formato uniforme de errores
   (`{error:{code,message,details}}`), JWT en cookies HttpOnly.
2. **Setear** `BACKEND_URL_CENTRAL` apuntando al central.
3. **Setear** `USE_MOCKS=false` (o eliminarlo del entorno).
4. **Validar** que las URLs de `capabilities.modulos.{reportes,kpis,acciones}.base_url`
   apuntan a hosts permitidos por la CSP del entrypoint.

Mientras el central V1 no implemente el contrato, la UI puede correr en
modo mock para demos y testing. Ver [`docs/plan.md`](docs/plan.md) (R1).

## Estructura del repo

```
src/
├── api/                       # cliente HTTP, types Zod, endpoints
├── app/                       # router, layout (TopBar, Sidebar, ProtectedRoute)
├── artifacts/                 # dispatcher + 11 tipos de artefactos
├── features/{chat,kpis,reportes,acciones,configuracion,auth,conversaciones}
├── i18n/                      # setup + locales es/en/pt
├── lib/                       # config, query-client, a11y helpers
├── mocks/                     # MSW handlers + fixtures
├── observability/             # logger JSON, Sentry, OTel
├── stores/                    # Zustand (auth, capabilities, conversaciones, kpis)
└── test/                      # setup vitest + axe helper

docker/                        # Dockerfile, nginx.conf, entrypoint.sh
docs/                          # spec.md + plan.md
.github/workflows/ci.yml       # CI: typecheck, lint, test, build, audit, docker, Trivy
```

## Convenciones del módulo central adoptadas

- JSON `snake_case` en todos los campos.
- Timestamps ISO 8601 con TZ (`2026-05-13T14:23:00Z`).
- Español neutro en nombres de campos (`consulta`, `respuesta`, `chunks_used`).
- Pydantic-style validation en boundary (Zod en la UI).
- Dominio configurable vía `domain*.yaml` del central, expuesto en
  `/capabilities.ui` — la UI nunca hardcodea el dominio.

Desviaciones deliberadas (esperan adopción por el central V2):
- Formato uniforme de error `{error:{code,message,details}}` (el central V1
  usa `HTTPException(detail: str)`).
- Logs JSON estructurados (el central V1 loguea texto plano).
- JWT en cookies HttpOnly + endpoints `/auth/*` (el central V1 no tiene auth).

## CI/CD

Cada push a `main` o PR contra `main`:

1. Install + typecheck + lint + format check + test + build
2. `npm audit --audit-level=high` (falla en high/critical)
3. Build imagen Docker
4. Smoke test contra `/healthz` y `/config.js`
5. Trivy scan (falla en CRITICAL/HIGH OS o library vulns)

## Cloud-agnóstico

Todo dentro de la imagen Docker:
- Sin CDNs externos en runtime (fonts, libraries, todo bundleado).
- Sin BaaS proprietary.
- Funciona en Docker Compose, Kubernetes (cualquier flavor), Docker Swarm,
  Nomad u on-prem.

## Licencia

Propietario — uso interno de Asistente-agentico.
