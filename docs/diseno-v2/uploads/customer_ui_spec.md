# Customer UI — Especificación para implementación por Claude Code

> Documento de referencia para implementar la interfaz de usuario customer-facing
> del producto. Cubre stack, arquitectura, contrato HTTP con el módulo central
> y los módulos opcionales, modelo de configuración, catálogo de artefactos,
> i18n, accesibilidad, seguridad y empaquetado Docker.
>
> **Alcance**: este spec describe solo el customer UI. El admin UI es un
> producto hermano con su propio spec, fuera del alcance de este documento.

---

## 0. Instrucciones para Claude Code

Antes de empezar a codear, ejecutar estos pasos en orden:

1. **Crear un repositorio nuevo e independiente**, separado del repo del módulo
   central (RAG batch). Nombre sugerido: `producto-customer-ui` o el que defina
   el equipo. No reutilizar el repo del central ni partir de una rama suya.

2. **Revisar la estructura actual del repo del módulo central** para entender:
   - El contrato HTTP existente (endpoints, headers, shapes de request y response).
   - Las convenciones de naming, manejo de errores y formato de logs.
   - Los nombres de tipos, campos y enums ya en uso, para mantener coherencia.

3. **Adoptar las convenciones del módulo central** donde apliquen:
   - Mismo formato de timestamps (ISO 8601 con TZ).
   - Mismo estilo de error responses (códigos HTTP estándar + cuerpo JSON con
     `error.code` y `error.message`).
   - Mismo idioma de campos JSON (español neutro, snake_case).

4. **Documentar en el README del nuevo repo** el link al repo del módulo
   central y cualquier desviación deliberada en convenciones, con razón.

5. **Mantener este documento en `docs/spec.md` del nuevo repo** como fuente
   de verdad del diseño. Mantenerlo sincronizado a medida que se descubran
   ajustes durante la implementación.

---

## 1. Arquitectura del sistema

El producto se distribuye como un conjunto de módulos Docker que el cliente
licencia y despliega:

```
┌─────────────────────────────────────────────────────┐
│   USUARIOS (web + móvil)        AUTH (IdP o IAM)    │
│              │                          │           │
│              └─────────┬────────────────┘           │
│                        ▼                            │
│            ┌──────────────────────┐                 │
│            │  customer UI (este)  │ ◄── HtTpS       │
│            └──────────────────────┘                 │
│                ▼  ▼  ▼  ▼  (directa a cada módulo)  │
│           ┌────┴──┴──┴──┴────┐                      │
│           │                  │                      │
│   ┌───────┴──────┐  ┌───┴───┐  ┌───┴────┐  ┌───┴────────┐
│   │Módulo central│  │Reportes│  │KPIs SSE│  │  Acciones  │
│   │(RAG + RBAC)  │  │(opc.)  │  │(opc.)  │  │  (opc.)    │
│   └──────┬───────┘  └────────┘  └────────┘  └─────┬──────┘
│          │                                         │      │
│   ┌──────┴────┐  ┌──────────────┐  ┌─────────┐    │      │
│   │ Lakehouse │  │ BD vectorial │  │   LLM   │    │ Integraciones
│   │ / repo    │  │   (chunks)   │  │ externo │    │ (SMTP, WA,
│   └───────────┘  └──────────────┘  └─────────┘    │  agentes IA)
│                                                    │      │
└────────────────────────────────────────────────────┘──────┘
```

### 1.1 Los 5 módulos del producto

| Módulo | Obligatorio | Función |
|--------|-------------|---------|
| customer UI (este) | Sí | Interfaz web responsiva (chat + dashboards + acciones) |
| Módulo central | Sí | Ingesta batch desde lakehouse, escritura de chunks con metadata, control de acceso vía JWT, orquestación del LLM |
| Reportes | Opcional | Generación y descarga de informes (PDF, XLSX) |
| KPIs streaming | Opcional | Métricas en vivo vía Server-Sent Events |
| Acciones | Opcional | Envío de correos, WhatsApp, llamadas a otros agentes IA |

Los tres opcionales se licencian por separado. La customer UI descubre qué
está activo en cada deployment vía `GET /capabilities` (sección 4.2).

### 1.2 Productos hermanos fuera del alcance

- **Admin UI**: producto separado, otra imagen Docker, otro repo, otro spec.
  Lo usan quienes mantienen el producto para gestionar tenants, licencias,
  configuración runtime, batch jobs y audit logs. La customer UI no se
  comunica con él directamente — los cambios que admins hacen llegan a la
  customer UI vía el módulo central (refresh de `/capabilities`).
- **Interfaces de DevOps / observabilidad**: dashboards de Grafana, Prometheus,
  Sentry, etc. son herramientas operativas, no productos comerciales.

---

## 2. Stack tecnológico

| Capa | Elección | Versión / nota |
|------|----------|----------------|
| Framework | React + TypeScript estricto | React 18, TS 5+ |
| Build / dev | Vite | 5+ |
| Estilos | Tailwind CSS | 3+, con CSS variables inyectadas desde `/capabilities.ui.colores` |
| Componentes UI base | shadcn/ui | Radix + Tailwind, copiados al repo |
| Iconos | Tabler Icons (vía `@tabler/icons-react`) | Set único, no mezclar otros |
| Estado global | Zustand | Con middleware `persist` para preferencias no sensibles |
| Data fetching y caché | TanStack Query | v5+ |
| Routing | React Router | v6+ |
| Gráficos | Recharts | Reemplaza Chart.js del prototipo |
| Tablas | TanStack Table | Para artefacto `tabla` |
| i18n | react-i18next | Con backend cargando JSON locales del bundle |
| SSE client | `@microsoft/fetch-event-source` | Con header `Authorization` |
| Formularios | React Hook Form + Zod | Para artefacto `formulario` y formularios internos |
| Error tracking | Sentry SDK (apunta a endpoint configurable) | Compatible con Sentry SaaS, self-hosted, o GlitchTip |
| Métricas y traces | OpenTelemetry browser SDK | Exporta OTLP a endpoint configurable |
| Markdown rendering | `react-markdown` + `rehype-sanitize` | Sanitización obligatoria |
| Build de imagen | Multi-stage Docker: `node:20-alpine` (build) + `nginx:alpine` (serve) | Imagen final ~20 MB |
| Tests | Vitest + Testing Library + Playwright | Unit + integration + e2e |

**Restricción cloud-agnóstica**: ninguna dependencia hardcoded a un proveedor.
Todo viaja dentro de la imagen Docker; no se cargan recursos externos en runtime
(ni siquiera CDNs de fonts o libraries — todo se empaqueta). Funciona en
Docker Compose, Kubernetes (cualquier flavor), Docker Swarm, Nomad u on-prem.

---

## 3. Modelo de tenancy y despliegue

### 3.1 Tenancy

Default: **un despliegue por cliente** (dedicated). Cada cliente recibe su
propio stack completo de módulos. Para multi-tenant a futuro, el `tenant_id`
viene en el JWT y propaga por todo el sistema, pero la imagen de la customer
UI es la misma — no requiere cambios.

### 3.2 Distribución

- Imagen Docker producida por CI/CD del repo.
- Versionado semver con tags (`producto-customer-ui:1.4.2`).
- Distribuible vía cualquier container registry (Docker Hub, GitHub Container
  Registry, Harbor, ECR, GCR, ACR, on-prem).
- Sin runtime dependencies en CDNs, BaaS, ni servicios proprietary.

---

## 4. Contrato HTTP

La customer UI consume endpoints expuestos por el módulo central y por los
módulos opcionales. Cookies HttpOnly llevan el JWT — la UI nunca toca el
token desde JavaScript.

### 4.1 Autenticación

| Endpoint | Método | Función |
|----------|--------|---------|
| `/auth/login` | POST | Autentica con credenciales o redirige al IdP externo. Setea cookies `Set-Cookie: jwt=...; HttpOnly; Secure; SameSite=Strict` y `refresh_token=...; HttpOnly; Secure; SameSite=Strict`. |
| `/auth/refresh` | POST | Refresh transparente. Lee el refresh token de cookie, emite nuevo JWT en cookie. |
| `/auth/logout` | POST | Borra las cookies de auth. |
| `/auth/me` | GET | Devuelve perfil del usuario autenticado (sin secretos). |

La elección de IdP externo vs IAM interno se configura en deploy-time vía
`AUTH_MODE` (sección 5.2). El contrato HTTP es el mismo en ambos casos.

**Refresh pattern**: un interceptor de `fetch` atrapa los `401`, llama
silenciosamente a `/auth/refresh`, y reintenta el request original. Si el
refresh también falla, redirige al flujo de login.

### 4.2 Capabilities (bootstrap)

`GET /capabilities`

Llamada de bootstrap. La UI la invoca apenas hay JWT válido y vuelve a
invocarla cuando recibe un `X-Capabilities-Version` distinto al cacheado.

**Response**:

```json
{
  "version": "1.4.0",
  "hash": "abc123...",
  "tenant": {
    "id": "tenant_x",
    "nombre": "Salmonera ACME",
    "expira": "2027-01-01T00:00:00Z"
  },
  "usuario": {
    "id_pseudo": "u_a1b2c3d4",
    "rol": "jefe_centro",
    "gerencia": "operaciones",
    "permisos": ["consultar", "ver_kpis", "enviar_correo"]
  },
  "modulos": {
    "central":   { "enabled": true,  "base_url": "https://api.cliente.com/v1" },
    "reportes":  { "enabled": true,  "base_url": "https://api.cliente.com/reportes",
                   "features": ["pdf", "excel"] },
    "kpis":      { "enabled": true,  "base_url": "https://api.cliente.com/kpis",
                   "features": ["streaming_sse"] },
    "acciones":  { "enabled": false, "razon": "no_licenciado" }
  },
  "ui": {
    "titulo": "Asistentes Virtuales",
    "subtitulo": "Sistema integrado de gestión productiva",
    "logo_url": "https://...",
    "favicon_url": "https://...",
    "icono_sistema": "AV",
    "icono_emoji": "🐟",
    "colores": {
      "primario": "#eaeaea",
      "sidebar": "#002c48",
      "acento":  "#C8102E"
    },
    "etiquetas":    { "rol": "Rol", "usuario_id": "Usuario" },
    "botones":      { "enviar": "Enviar" },
    "placeholders": { "consulta": "Escribe tu consulta..." },
    "mensajes":     { "sin_respuesta": "Sin respuesta." },
    "flags":        { "autorenombrar_ambito_al_primer_mensaje": true },
    "asistentes": [
      { "id": "engorda", "nombre": "Engorda", "subtitulo": "Centros y jaulas",
        "ambitos": ["centros_cultivo", "mortalidad_cultivo"], "disabled": false }
    ],
    "consultas_sugeridas": { "centros_cultivo": ["¿Cómo está el {entidad}?"] },
    "entidades_principales": [
      { "nombre": "Centro de Cultivo", "identificador": "centro_id",
        "regex": "\\bCTR-\\d{3}\\b", "prefijo_display": "Centro" }
    ]
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-7",
    "features": ["function_calling", "long_context"]
  }
}
```

La UI **debe** tolerar campos desconocidos (forward compatibility). La UI
**debe** mostrar modo degradado si `/capabilities` falla — solo chat básico
contra el módulo central, banner de "configuración no disponible".

**Aceptar `lang` como query param**: `GET /capabilities?lang=en` para traer
strings ya traducidos al idioma del usuario (ver sección 13).

### 4.3 Conversaciones (persistidas server-side)

| Endpoint | Método | Función |
|----------|--------|---------|
| `/conversaciones` | GET | Lista de conversaciones del usuario (paginada). |
| `/conversaciones` | POST | Crea conversación nueva. |
| `/conversaciones/{id}` | GET | Mensajes de una conversación. |
| `/conversaciones/{id}/mensajes` | POST | Envía un mensaje y recibe la respuesta del LLM. Equivale al `/consulta` del prototipo, pero dentro de una conversación persistida. |
| `/conversaciones/{id}` | DELETE | Elimina conversación. |

**Request a `POST /conversaciones/{id}/mensajes`**:

```json
{
  "texto": "Mortalidad última semana en CTR-001",
  "asistente_id": "engorda",
  "hints": {
    "grafico_rule_id": "MORT_DIA_C001",
    "ventana_dias": "7"
  }
}
```

**Response** (ver sección 6 para detalles de cada artefacto):

```json
{
  "mensaje_id": "msg_xyz",
  "respuesta": "En los últimos 7 días, CTR-001 registró...",
  "artefactos": [
    { "tipo": "serie_temporal", "version": 1, ... },
    { "tipo": "banner", "version": 1, "variante": "causal", ... }
  ],
  "metadata": {
    "chunks_used": 7,
    "scopes": ["mortalidad_cultivo"],
    "ambiguous_routing": false,
    "permisos_aplicados": { "rol": "jefe_centro", "filtros_jwt_aplicados": [...] }
  },
  "blocked": false,
  "error": null
}
```

### 4.4 Preferencias

| Endpoint | Método | Función |
|----------|--------|---------|
| `/usuario/preferencias` | GET | Lee preferencias canónicas del server. |
| `/usuario/preferencias` | PUT | Actualiza preferencias. |

```json
{
  "idioma": "es",
  "vista_inicial": "chat",
  "notificaciones": { "email": true, "in_app": true }
}
```

### 4.5 Acciones (human-in-the-loop)

`POST /accion`

Llamado tras confirmación explícita del usuario sobre una `accion_propuesta`
(ver sección 6.3).

```json
{
  "id_propuesta": "act_abc123",
  "conversation_id": "conv_xyz",
  "parametros_finales": {
    "destinatario": "gerencia@cliente.com",
    "asunto": "Reporte de mortalidad",
    "cuerpo": "..."
  },
  "confirmado_en": "2026-05-13T14:23:00Z"
}
```

El módulo central valida que el `id_propuesta` haya sido emitido legítimamente
en esa conversación, valida permisos, registra la acción en el audit log, y
delega al módulo de acciones. El módulo de acciones ejecuta contra la
integración externa (SMTP, WhatsApp, otro agente IA) y devuelve resultado.

### 4.6 Reportes

`GET {reportes.base_url}/{report_id}` — descarga directa del archivo, con
JWT en cookie. Devuelve `Content-Type: application/pdf` (u otro) y
`Content-Disposition: attachment; filename=...`.

`GET {reportes.base_url}/catalogo` — lista de reportes disponibles para el
usuario, filtrada por permisos.

### 4.7 KPIs streaming

`GET {kpis.base_url}/stream?metricas=...&entidades=...` con
`Accept: text/event-stream`. Server-Sent Events. La UI usa
`@microsoft/fetch-event-source` para pasar JWT en header `Authorization`
(las cookies HttpOnly no funcionan en SSE entre orígenes distintos, así que
para este endpoint específico se usa el header). Si el dominio es el mismo
que la UI, las cookies funcionan y `EventSource` nativo también.

**Eventos**:

```
event: kpi_update
data: { "kpi_id": "biomasa_total", "valor": "2.450 t", "ts": "2026-05-13T..." }

event: heartbeat
data: { "ts": "2026-05-13T..." }
```

La UI soporta `Last-Event-ID` para retomar tras desconexión.

### 4.8 Audit (telemetría de auditoría del usuario)

`POST /audit/event` — la UI envía eventos auditables (login, logout,
confirmación de acción, descarga, cambio de preferencias). Distinto de
observabilidad técnica (sección 14).

### 4.9 Headers transversales

| Header | Dirección | Función |
|--------|-----------|---------|
| `Authorization: Bearer <JWT>` | UI → backend | Solo en SSE entre dominios distintos. En el resto, JWT viaja en cookie HttpOnly. |
| `X-Client-Version` | UI → backend | Versión de la customer UI (de `package.json` inyectada en build). |
| `X-Latest-Client-Version` | backend → UI | Versión más reciente disponible. Si difiere de la del cliente, mostrar banner de actualización. |
| `X-Capabilities-Version` | backend → UI | Hash de la respuesta vigente de `/capabilities`. Si difiere del cacheado, refetch. |
| `Accept-Language` | UI → backend | Idioma activo del usuario. |
| `Content-Type: application/json` | ambos | JSON en todos los requests y responses excepto descargas y SSE. |

### 4.10 Errores

Formato uniforme:

```json
{
  "error": {
    "code": "RBAC_DENIED" | "VALIDATION_ERROR" | "LLM_BLOCKED" | "...",
    "message": "Mensaje humano-legible en el idioma activo",
    "details": { /* opcional, info adicional */ }
  }
}
```

Códigos HTTP estándar: 400 (validación), 401 (auth), 403 (RBAC), 404, 409
(conflict), 426 (versión de cliente incompatible), 500 (error backend),
502 (módulo opcional caído), 503 (mantenimiento).

---

## 5. Modelo de configuración en tres capas

### 5.1 Capa 1 — Build-time

Defaults universales del producto. Lo que nunca cambia entre clientes:

- Textos en español neutro como fallback de i18n.
- Paleta de colores fallback (`--accent: #c96442`, `--bg: #1a1a1a`, etc.).
- Comportamiento por defecto de componentes (animaciones, timings, breakpoints).
- Set de iconos (Tabler).

Vive en el código fuente. Solo cambia con nuevas versiones del producto.

### 5.2 Capa 2 — Deploy-time (variables de entorno)

Estructural, no cambia día a día:

| Variable | Default | Función |
|----------|---------|---------|
| `BACKEND_URL_CENTRAL` | `http://central:8080` | URL del módulo central |
| `AUTH_MODE` | `iam_interno` | `idp_externo` o `iam_interno` |
| `AUTH_IDP_URL` | (vacío) | URL del IdP externo si `AUTH_MODE=idp_externo` |
| `IDIOMA_DEFAULT` | `es` | `es`, `en` o `pt` |
| `TENANT_ID` | (vacío) | Solo en dedicated; en multi-tenant se infiere del JWT |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (vacío) | URL del colector OTLP; vacío deshabilita métricas |
| `SENTRY_DSN` | (vacío) | DSN para errores; vacío redirige a `console.error` |
| `TELEMETRY_ENABLED` | `true` | Toggle global de telemetría hacia afuera |

Inyectadas vía Docker Compose, Kubernetes ConfigMap, o equivalente. Cambiarlas
requiere relanzar el contenedor.

**Mecanismo de inyección en runtime**: las env vars se materializan en
`/usr/share/nginx/html/config.js` mediante un script de entrypoint del
contenedor que lee `process.env` y escribe un archivo JS con `window.__APP_CONFIG__ = {...}`.
La SPA lo lee al arrancar. Esto evita rebuilds para cambiar variables.

### 5.3 Capa 3 — Runtime (vía `/capabilities`)

Lo que cambia sin redeploy. Ya descrito en sección 4.2.

### 5.4 Cascada de override

Capa 3 (runtime) sobrescribe Capa 2 (deploy) que sobrescribe Capa 1 (build).
La UI siempre prefiere la capa más alta que tenga valor. Si una capa devuelve
`null` o no incluye la clave, se cae a la capa inferior. Esto garantiza que
la UI nunca queda en blanco — los defaults de Capa 1 son la red de seguridad.

---

## 6. Catálogo de artefactos

La respuesta del LLM (sección 4.3) trae un array `artefactos[]` con objetos
tipados. La UI tiene un dispatcher único (`renderArtifact()`) que mapea cada
`tipo` a un componente React.

**Reglas comunes a todos los artefactos**:

- Campo `tipo: string` discriminador.
- Campo `version: number` para evolución forward-compatible.
- Si la UI no reconoce el `tipo` o la `version`, renderiza
  `<UnknownArtifactPlaceholder>` y loguea warning. No crashea.
- TypeScript usa discriminated unions sobre el campo `tipo` para garantizar
  exhaustividad en compile time.

### 6.1 Display passive

#### `texto_respuesta` (siempre presente como `respuesta` top-level del response, no en el array)

Markdown ligero. Renderizado con `react-markdown` + `rehype-sanitize` para
prevenir XSS. Soporta negritas, listas, links (con `target="_blank"
rel="noopener noreferrer"`), code blocks (sin ejecución).

#### `serie_temporal`

```json
{
  "tipo": "serie_temporal", "version": 1,
  "grafico_rule_id": "MORT_DIA_C001",
  "titulo": "Mortalidad diaria — Centro 001",
  "subtitulo": "Últimos 30 días · CTR-001",
  "ventana_actual": "30",
  "ventanas_disponibles": ["7", "30", "90", "ciclo"],
  "unidad_y": "peces",
  "puntos": [{ "x": "2026-04-13", "y": 12, "color": "rojo" }],
  "rango_objetivo_y": { "y_min": 6.5, "y_max": 8.0, "etiqueta": "Zona objetivo" },
  "metricas_resumen": {
    "promedio":  { "etiqueta": "Promedio",  "valor": 8.2, "unidad": "peces/día" }
  }
}
```

Recharts. Al cambiar ventana, la UI llama
`POST /conversaciones/{id}/mensajes/{msg_id}/refresh-grafico` (no llama al LLM
de nuevo, solo recalcula los puntos para la ventana nueva).

#### `tabla`

```json
{
  "tipo": "tabla", "version": 1,
  "titulo": "Centros activos",
  "columnas": [
    { "id": "centro_id", "label": "Centro", "tipo": "string" },
    { "id": "biomasa", "label": "Biomasa (t)", "tipo": "number" },
    { "id": "fcr", "label": "FCR", "tipo": "number" }
  ],
  "filas": [
    { "centro_id": "CTR-001", "biomasa": 850, "fcr": 1.42 }
  ],
  "sortable": true,
  "filterable": true,
  "paginate_at": 25
}
```

Renderizado con TanStack Table.

#### `tablero_kpi`

```json
{
  "tipo": "tablero_kpi", "version": 1,
  "titulo": "Resumen ejecutivo",
  "subtitulo": "Abril 2026",
  "kpis": [
    {
      "id": "biomasa_total",
      "etiqueta": "Biomasa total",
      "valor": "2.450 t",
      "color": "verde",
      "target": "2.300 t",
      "delta": "+6.5%",
      "delta_tipo": "positivo",
      "descripcion": "Acumulado en 4 centros"
    },
    { "id": "mortalidad", "bloqueado": true, "etiqueta": "Mortalidad",
      "mensaje": "Sin permisos para este KPI" }
  ]
}
```

#### `imagen`

```json
{
  "tipo": "imagen", "version": 1,
  "url": "https://...",
  "alt": "Diagrama del centro CTR-001",
  "ancho_max": 800
}
```

#### `banner`

```json
{
  "tipo": "banner", "version": 1,
  "variante": "info" | "warning" | "error" | "success" | "causal" | "mantenimiento",
  "mensaje": "...",
  "severidad": "baja" | "media" | "alta",
  "icono": "alert-triangle",
  "accion_opcional": { "label": "Ver detalle", "url": "..." }
}
```

**Nota**: el `causal_context` del prototipo se generaliza a `banner` con
`variante: "causal"`. Esto unifica todos los mensajes destacados en un solo
artefacto y permite agregar variantes nuevas (mantenimiento, compliance,
licencia por vencer) sin tocar el dispatcher.

### 6.2 Streaming

#### `kpi_stream` (vía SSE, no en el response de chat)

Eventos que llegan al canal SSE; cada uno actualiza un KPI ya renderizado.

```json
{ "kpi_id": "biomasa_total", "valor": "2.451 t", "ts": "2026-05-13T..." }
```

#### `progreso`

```json
{
  "tipo": "progreso", "version": 1,
  "operacion_id": "ingesta_batch_xyz",
  "porcentaje": 47,
  "etapa": "Procesando chunks",
  "completado": false
}
```

### 6.3 Interactive

#### `accion_propuesta`

```json
{
  "tipo": "accion_propuesta", "version": 1,
  "tipo_accion": "ENVIAR_CORREO",
  "id_propuesta": "act_abc123",
  "parametros": {
    "destinatario": "gerencia@cliente.com",
    "asunto": "Reporte de mortalidad — CTR-001",
    "cuerpo": "...",
    "adjuntos": [{ "tipo": "grafico", "ref": "ctr001_mort_30d" }]
  },
  "permite_edicion": ["destinatario", "asunto", "cuerpo"],
  "riesgo": "bajo" | "medio" | "alto",
  "requiere_confirmacion": true
}
```

La UI renderiza tarjeta editable con botones `[Confirmar]` y `[Descartar]`.
Al confirmar, llama `POST /accion` (sección 4.5).

**Niveles de fricción**:
- `riesgo: "bajo"` → un solo click confirma.
- `riesgo: "medio"` → click + checkbox de confirmación visible.
- `riesgo: "alto"` → doble confirmación (escribir el destinatario, o código).

#### `archivo_descargable`

```json
{
  "tipo": "archivo_descargable", "version": 1,
  "nombre_archivo": "plantilla_LP-2026-0508.xlsx",
  "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "modo": "base64_inline" | "url_firmada",
  "base64_contenido": "UEsDBBQABgAIAAA...",
  "url": null,
  "tamano_bytes": 42000
}
```

`base64_inline` para archivos pequeños (<1 MB); `url_firmada` con URL de
corta vida (~60 s) para archivos grandes.

#### `formulario`

```json
{
  "tipo": "formulario", "version": 1,
  "titulo": "Necesito más detalles",
  "campos": [
    { "nombre": "fecha_desde", "label": "Desde", "tipo": "date", "requerido": true },
    { "nombre": "centro_id",   "label": "Centro", "tipo": "select",
      "opciones": [{ "value": "CTR-001", "label": "Centro 001" }] }
  ],
  "submit_label": "Continuar",
  "destino": "POST /conversaciones/{id}/mensajes"
}
```

Renderizado con React Hook Form + Zod (schema generado desde `campos[]`).

#### `seleccion`

```json
{
  "tipo": "seleccion", "version": 1,
  "pregunta": "¿De qué centro querés ver la mortalidad?",
  "opciones": [
    { "value": "CTR-001", "label": "Centro 001 — Patagonia Norte" },
    { "value": "CTR-002", "label": "Centro 002 — Patagonia Sur" }
  ],
  "multi": false
}
```

Cada opción al ser clickeada dispara un follow-up automático en el chat.

### 6.4 Metadata / provenance

#### `chunks_used` (siempre presente como `metadata.chunks_used` del response)

Renderizado como pildorita colapsable bajo el bubble del asistente. Al
expandir muestra `metadata.scopes`, `metadata.ambiguous_routing`, y campos
de auditoría.

#### `permisos_aplicados`

Renderizado dentro del mismo bloque colapsable. Muestra qué claims del JWT
filtraron los chunks ("Solo se consideraron chunks visibles para tu rol
`jefe_centro` y gerencia `operaciones`"). Útil para debugging y auditoría.

### 6.5 Patrones de implementación

```ts
// types/artefactos.ts
export type Artefacto =
  | { tipo: 'serie_temporal'; version: 1; ... }
  | { tipo: 'tabla'; version: 1; ... }
  | { tipo: 'tablero_kpi'; version: 1; ... }
  | { tipo: 'imagen'; version: 1; ... }
  | { tipo: 'banner'; version: 1; ... }
  | { tipo: 'progreso'; version: 1; ... }
  | { tipo: 'accion_propuesta'; version: 1; ... }
  | { tipo: 'archivo_descargable'; version: 1; ... }
  | { tipo: 'formulario'; version: 1; ... }
  | { tipo: 'seleccion'; version: 1; ... };

// components/ArtefactDispatcher.tsx
export function ArtefactDispatcher({ artefacto }: { artefacto: Artefacto }) {
  switch (artefacto.tipo) {
    case 'serie_temporal':     return <SerieTemporalCard {...artefacto} />;
    case 'tabla':              return <TablaCard {...artefacto} />;
    case 'tablero_kpi':        return <TableroKpiCard {...artefacto} />;
    case 'imagen':             return <ImagenCard {...artefacto} />;
    case 'banner':             return <BannerCard {...artefacto} />;
    case 'progreso':           return <ProgresoCard {...artefacto} />;
    case 'accion_propuesta':   return <AccionPropuestaCard {...artefacto} />;
    case 'archivo_descargable':return <ArchivoDescargableCard {...artefacto} />;
    case 'formulario':         return <FormularioCard {...artefacto} />;
    case 'seleccion':          return <SeleccionCard {...artefacto} />;
    default: {
      // Compile error si falta caso; runtime placeholder si llega tipo desconocido
      const _exhaustive: never = artefacto;
      return <UnknownArtifactPlaceholder data={artefacto} />;
    }
  }
}
```

Cada componente se carga con `React.lazy` + `Suspense` para mantener el
bundle inicial chico.

---

## 7. Autenticación y autorización

### 7.1 Dos modos de autenticación

| Modo | Cuándo | Cómo |
|------|--------|------|
| `idp_externo` | Cliente usa Keycloak, Entra ID, Okta, Auth0, etc. | UI redirige a `AUTH_IDP_URL` para OIDC flow; el backend del producto recibe el callback, valida el ID token, emite su propio JWT en cookie HttpOnly. |
| `iam_interno` | Producto provee su propio IAM | UI muestra formulario user/password; `POST /auth/login` valida y emite cookie. |

En ambos casos, la customer UI no toca el JWT desde JavaScript. Las cookies
viajan automáticamente con cada request al mismo dominio (o con
`credentials: 'include'` si hay CORS).

### 7.2 JWT — claims relevantes para la UI

El JWT lo emite el módulo central (no la UI). Contiene:

- `sub` — pseudo-ID del usuario.
- `tenant_id` — en multi-tenant.
- `rol` — string (`jefe_centro`, `supervisor_planta`, etc.).
- `gerencia` — string.
- `filtros` — array de pares clave/valor para chunk-level RBAC.
- `permisos` — array de strings (`enviar_correo`, `ver_kpis`, etc.).
- `exp` — expiración.

La UI no parsea ni inspecciona el JWT. Recibe los claims relevantes en la
respuesta de `/capabilities.usuario`, donde el módulo central los expone en
formato seguro.

### 7.3 RBAC visual

La UI hace pre-checks léxicos para cortocircuitar consultas obviamente fuera
de scope antes de pegarle al backend (patrón heredado del prototipo). Pero
la fuente autoritativa es el backend — el motor de chunk-level RBAC del
módulo central.

Operaciones RBAC en la UI:

- Mostrar/ocultar asistentes según `capabilities.usuario.rol` cruzado con
  `capabilities.ui.asistentes[].ambitos`.
- Habilitar/deshabilitar el input de acciones según `permisos`.
- Filtrar consultas sugeridas por ámbito permitido.
- Indicar KPIs bloqueados con `bloqueado: true` en el tablero (que viene del
  backend).

---

## 8. Comunicación con módulos backend

### 8.1 Topología

La UI habla **directamente** con cada módulo backend, no a través del central
como proxy:

| Operación | Módulo destino | Protocolo |
|-----------|----------------|-----------|
| Chat / consulta | Central | HTTPS REST |
| Capabilities | Central | HTTPS REST |
| Auth | Central | HTTPS REST |
| Conversaciones | Central | HTTPS REST |
| Descarga de reportes | Reportes | HTTPS GET (file) |
| KPIs streaming | KPIs | SSE |
| **Acciones** | **Central → Acciones** (excepción) | HTTPS REST |

Las URLs de cada módulo opcional vienen en `capabilities.modulos[X].base_url`,
no están hardcoded.

### 8.2 Validación de JWT distribuida (JWKS)

Cada módulo backend valida el JWT localmente usando claves públicas (JWKS)
del módulo central. La UI no se entera de esto — solo manda el cookie y
recibe la respuesta.

### 8.3 Excepción para acciones

Acciones siempre van vía el central por auditoría:

```
UI → POST /accion → Central valida → Central llama Acciones → Acciones ejecuta integración externa → resultado vuelve a la UI
```

---

## 9. Estado de sesión y persistencia

### 9.1 Tres tiers

| Tier | Almacenamiento | Qué guarda |
|------|----------------|------------|
| 1 (in-memory) | Zustand store | UI ephemeral: modales, dropdowns, sidebar, conexión SSE activa, acciones propuestas pendientes |
| 2 (browser persistent) | `localStorage` | Idioma preferido, ID de última conversación, caché de `/capabilities` con TTL, última URL para redirect post re-login |
| 2 (browser persistent) | `sessionStorage` | Borradores de mensajes no enviados, estado de wizards, scroll position |
| 3 (server-side) | Cookies HttpOnly | JWT y refresh token (nunca accesibles a JS) |
| 3 (server-side) | Módulo central | Conversaciones, preferencias canónicas, audit log de acciones |

### 9.2 `IndexedDB`

No usar en v1. Si en el futuro hay caché offline grande, evaluar.

### 9.3 Recuperación de sesión

Al cargar la UI:

1. Verificar si hay cookie de JWT válida (chequea `/auth/me`).
2. Si sí, fetch `/capabilities`.
3. Si no, redirige al flujo de login.

Al cambiar de dispositivo o re-abrir el navegador:

1. Si la cookie sobrevive (no caducó), retoma sesión automáticamente.
2. Las conversaciones se recuperan de `/conversaciones` — historial completo
   server-side, no se pierde.

---

## 10. Internacionalización

### 10.1 Idiomas en v1

`es` (default), `en`, `pt`. Más idiomas se agregan creando un JSON nuevo en
`locales/` y registrándolo en el bundle.

### 10.2 Cascada de detección

1. Preferencia explícita del usuario (`localStorage`).
2. Header `Accept-Language` del navegador.
3. Variable de entorno `IDIOMA_DEFAULT` (Capa 2).
4. Default hardcoded (`es`).

### 10.3 Dos planos de strings

| Plano | Ejemplos | Origen |
|-------|----------|--------|
| Estáticos (UI core) | "Enviar", "Cargando...", "Sesión expirada" | `locales/{lang}.json` bundleados |
| Dinámicos (por tenant) | Títulos, asistentes, sugerencias, etiquetas custom | `/capabilities?lang={lang}` ya traducido |

### 10.4 Pluralización, fechas, números

- Pluralización: sintaxis ICU de i18next.
- Fechas y números: `Intl.DateTimeFormat` e `Intl.NumberFormat` con locale activo.

### 10.5 RTL (futuro)

No en v1. CSS logical properties (`margin-inline-start`) ya en uso para no
preludir el soporte futuro vía modificador `rtl:` de Tailwind.

### 10.6 Switcher

En menú de perfil. Cambio inmediato:

1. Guarda preferencia en `localStorage` y en `/usuario/preferencias`.
2. Re-pide `/capabilities?lang={nuevo}`.
3. i18next recarga el bundle estático.
4. UI se re-renderiza.

### 10.7 Workflow de traducción

- JSON files en `locales/` con namespace `customer:`.
- Script de CI compara claves entre `es.json`, `en.json`, `pt.json` para detectar faltantes.
- Compatible con Crowdin, Lokalise, Weblate vía export/import.

---

## 11. Mobile y responsive

### 11.1 Estrategia

**Responsive web mobile-first** como única superficie. No app nativa en v1.

### 11.2 Plan de fases

| Fase | Qué se construye | Cuándo |
|------|------------------|--------|
| 1 (esta versión) | Responsive web mobile-first | Ahora |
| 2 | PWA: manifest, service worker, install prompt | Cuando un cliente lo pida |
| 3 | Wrapper Capacitor para apps nativas | Solo si emerge necesidad real |

Fase 1 debe no preludir las fases 2 y 3: no asumir conexión permanente,
manejar loading/error con tolerancia a latencia móvil, mantener bundle inicial liviano.

### 11.3 Patrones

- Breakpoints Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Sidebar colapsable en mobile (patrón hamburguesa).
- Tablas adaptativas: cards apilables en mobile, scroll horizontal con columna fija en tablet.
- Touch targets ≥ 44 px (WCAG + Apple HIG).
- Inputs con `inputmode` apropiado.
- Scroll containers explícitos — chat con scroll interno para que el textarea quede siempre visible.

---

## 12. Observabilidad

### 12.1 Tres categorías

| Categoría | Qué se captura | Exportación |
|-----------|----------------|-------------|
| Errores | Excepciones no atrapadas, error boundaries de React, errores de red, 5xx del backend | Sentry-compatible SDK → `SENTRY_DSN` |
| Métricas y traces | Core Web Vitals (LCP, INP, CLS, TTFB), latencia de API, ciclo de vida SSE, navegación | OpenTelemetry browser SDK → `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Eventos de auditoría | Login, logout, confirmación de acciones, descargas, cambios de preferencias | `POST /audit/event` al módulo central |

### 12.2 Toggle global

`TELEMETRY_ENABLED=false` deshabilita exportación a terceros (modo air-gapped
o privacidad estricta). Eventos de auditoría al módulo central siguen
fluyendo porque son parte del producto, no telemetría externa.

### 12.3 Qué NO se reporta

- Contenido de mensajes (preguntas, respuestas, chunks).
- Valor de campos de formularios.
- Identidad de usuarios en claro (siempre pseudo-ID hasheado).
- JWT o cualquier credencial.
- Contenido de `/capabilities` (puede tener info sensible del cliente).

### 12.4 Formato de logs

JSON estructurado:

```json
{
  "timestamp": "2026-05-13T14:23:00Z",
  "level": "error" | "warn" | "info",
  "category": "api" | "render" | "auth" | "sse" | "lifecycle",
  "event": "consulta_failed",
  "user_pseudo_id": "u_a1b2c3d4",
  "tenant_id": "tenant_x",
  "client_version": "1.4.2",
  "context": { /* sin PII */ }
}
```

### 12.5 Consola vs colector

Solo en `NODE_ENV === 'development'` se escribe verbose a consola. En
producción todo va al colector configurado.

---

## 13. Versionado

### 13.1 Cuatro niveles

1. **Versión de la UI** — inyectada desde `package.json` en build como
   `__APP_VERSION__`. Visible en footer / pantalla "Acerca de". Va en
   header `X-Client-Version` en cada request.
2. **Versión del API del central** — prefijo de URL: `/v1/consulta`, `/v1/capabilities`.
3. **Versión de cada artefacto** — campo `version` en payload.
4. **Versión de `/capabilities`** — campo `version` + `hash` en la respuesta.

### 13.2 Detección de UI desactualizada

Backend manda `X-Latest-Client-Version` en cualquier response. Si difiere
de la versión propia, la UI muestra banner no intrusivo: "Hay una versión
nueva. Refrescar la página para actualizar." No auto-refresh.

### 13.3 Política de compatibilidad

El backend soporta las últimas N versiones del API simultáneamente (definido
en el spec del central). Si la UI manda un `X-Client-Version` fuera de la
ventana de compatibilidad, el backend responde `426 Upgrade Required` y la
UI muestra mensaje claro.

### 13.4 Cambios al contrato

| Cambio | Cómo |
|--------|------|
| Añadir campo opcional | OK directo |
| Añadir artefacto nuevo | OK (UI desconocida muestra placeholder) |
| Cambiar shape de artefacto | Bump de `version` del artefacto, soportar ambas temporalmente |
| Eliminar endpoint o campo requerido | Bump del prefijo `/v2/` |

---

## 14. Seguridad del navegador

### 14.1 CSP (Content Security Policy) estricto

Servido por nginx en cada response:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';  # Tailwind genera estilos inline
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' {BACKEND_URLS};
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

`{BACKEND_URLS}` se sustituye en runtime con los hosts permitidos
(módulo central y módulos opcionales) leídos de `window.__APP_CONFIG__`.

### 14.2 CORS

Si UI y backend están en dominios distintos:

- Backend responde con `Access-Control-Allow-Origin: {ui_origin}` (no `*`).
- Backend responde con `Access-Control-Allow-Credentials: true`.
- Cookies marcadas `SameSite=None; Secure` en lugar de `Strict` (necesario
  para cross-site con credentials).
- Cliente hace fetch con `credentials: 'include'`.

Idealmente: mismo dominio, distinto path (`/app` para UI, `/api` para backend
via reverse proxy). Evita complejidad de CORS y permite `SameSite=Strict`.

### 14.3 Sanitización

- **Respuestas del LLM**: pasan por `rehype-sanitize` (allow list de tags y
  atributos) antes de renderizar el markdown. Nunca se renderiza HTML crudo.
- **Inputs del usuario**: se envían tal cual al backend; el backend es
  responsable de validación. La UI solo trimea y limita longitud.
- **URLs en artefactos**: validar protocolo `https:` o `http:` (no `javascript:`,
  no `data:` salvo imágenes con mime explícito).

### 14.4 Almacenamiento seguro

- JWT y refresh token: solo cookies HttpOnly Secure SameSite. Nunca en JS.
- `localStorage` y `sessionStorage`: solo datos no sensibles (idioma,
  caché de capabilities, IDs, drafts). Nunca tokens, nunca contenido de chat.
- Si se detecta inyección o tampering en localStorage (e.g., versión imposible
  de capabilities), la UI lo borra y re-fetcha.

### 14.5 Headers de seguridad adicionales

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

(Permissions-Policy se ajusta si el producto necesita cámara/GPS/etc.)

### 14.6 Dependencias y supply chain

- Lockfile (`package-lock.json` o `pnpm-lock.yaml`) commiteado.
- CI corre `npm audit` con fail en `high` o `critical`.
- Renovate o Dependabot para actualizaciones automatizadas.
- Imagen Docker escaneada con Trivy o equivalente en CI.

---

## 15. Accesibilidad

### 15.1 Estándar

**WCAG 2.1 nivel AA** como requisito mínimo. Validado en CI con `axe-core`
y test manuales con screen reader (NVDA en Windows, VoiceOver en macOS).

### 15.2 Base provista por shadcn/Radix

shadcn/ui está construido sobre Radix Primitives, que implementan los
patrones de la WAI-ARIA Authoring Practices Guide (APG). Esto entrega
gratis:

- Foco gestionado correctamente en modales, dropdowns, popovers.
- Teclado: Tab, Shift+Tab, Escape, flechas, Enter, Space funcionan donde corresponde.
- Atributos ARIA: roles, labels, expanded, current, etc.
- Anuncios a screen readers vía `aria-live` cuando hace falta.

### 15.3 Requisitos específicos

- **Contraste**: mínimo 4.5:1 para texto normal, 3:1 para texto grande y UI components.
  Tailwind config usa solo combinaciones que cumplen. Si el branding del
  cliente trae colores fuera de spec, la UI ajusta automáticamente la
  variante de texto (claro/oscuro) para mantener contraste — o muestra
  warning en admin UI (responsabilidad del admin UI, no esta).
- **Foco visible**: `:focus-visible` en todos los elementos interactivos
  con outline claro. Nunca `outline: none` sin reemplazo.
- **Touch targets**: ≥ 44×44 px en mobile.
- **Labels asociados**: cada input tiene un `<label htmlFor>` o `aria-label`.
- **Mensajes de error**: asociados al input vía `aria-describedby`.
- **Loading states**: anunciados con `aria-busy` o `aria-live`.
- **Animaciones**: respetar `prefers-reduced-motion` — pausar o eliminar
  animaciones no esenciales.

### 15.4 Componentes con tratamiento especial

- **Chat bubbles**: rol `region` con `aria-label` apropiado. Mensajes nuevos
  anunciados via `aria-live="polite"`.
- **Charts (Recharts)**: tabla de datos accesible bajo el gráfico (visible
  o `sr-only`). Descripciones de tendencia en texto.
- **KPI dashboard**: cada KPI con label y valor anunciables; cambios via
  SSE actualizan ARIA-live regions con throttle (no más de 1 anuncio cada
  ~30s para no saturar).
- **Acciones**: tarjeta de acción navegable por teclado; botones de
  confirmación con labels claros, no solo iconos.

### 15.5 Tests

- Unit: `@testing-library/jest-dom` + `jest-axe` en componentes críticos.
- E2E: Playwright con axe integrado en flujos principales.
- Manual: checklist documentado para releases.

---

## 16. Estructura del repositorio

```
producto-customer-ui/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/             # componentes generales (Layout, Sidebar, TopBar)
│   ├── features/               # módulos funcionales
│   │   ├── chat/
│   │   ├── conversaciones/
│   │   ├── kpis/
│   │   ├── reportes/
│   │   └── acciones/
│   ├── artifacts/              # componentes de cada tipo de artefacto
│   │   ├── ArtefactDispatcher.tsx
│   │   ├── SerieTemporalCard.tsx
│   │   ├── TablaCard.tsx
│   │   ├── TableroKpiCard.tsx
│   │   ├── BannerCard.tsx
│   │   ├── AccionPropuestaCard.tsx
│   │   └── ...
│   ├── design-system/          # tokens, primitivos shadcn — para extraer luego
│   │   ├── tokens.ts
│   │   ├── ui/                 # shadcn copy-paste components
│   │   └── icons.ts
│   ├── stores/                 # Zustand stores
│   │   ├── conversaciones.ts
│   │   ├── preferencias.ts
│   │   └── ui.ts
│   ├── hooks/
│   ├── locales/                # i18n
│   │   ├── es.json
│   │   ├── en.json
│   │   └── pt.json
│   ├── api/                    # cliente HTTP, interceptores, tipos
│   │   ├── client.ts           # fetch wrapper con interceptor 401
│   │   ├── types.ts            # discriminated unions de artefactos
│   │   ├── capabilities.ts
│   │   ├── conversaciones.ts
│   │   ├── kpis-sse.ts
│   │   └── auth.ts
│   ├── observability/          # OpenTelemetry, Sentry setup
│   └── lib/                    # utilidades transversales
├── public/
├── docs/
│   └── spec.md                 # este documento, en el repo
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile              # multi-stage: node build + nginx
│   ├── nginx.conf
│   └── entrypoint.sh           # genera config.js desde env vars
├── .env.example
├── .github/
│   └── workflows/              # CI: build, test, scan, push image
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── eslint.config.js
└── README.md
```

---

## 17. Build y despliegue

### 17.1 Dockerfile multi-stage

```dockerfile
# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VERSION
RUN npm run build -- --define:__APP_VERSION__=\"${VERSION}\"

# Stage 2: serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### 17.2 `entrypoint.sh`

Materializa env vars en un archivo JS que la SPA lee:

```sh
#!/bin/sh
set -e
cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  BACKEND_URL_CENTRAL: "${BACKEND_URL_CENTRAL}",
  AUTH_MODE: "${AUTH_MODE}",
  AUTH_IDP_URL: "${AUTH_IDP_URL:-}",
  IDIOMA_DEFAULT: "${IDIOMA_DEFAULT:-es}",
  TENANT_ID: "${TENANT_ID:-}",
  OTEL_EXPORTER_OTLP_ENDPOINT: "${OTEL_EXPORTER_OTLP_ENDPOINT:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}",
  TELEMETRY_ENABLED: "${TELEMETRY_ENABLED:-true}"
};
EOF
exec "$@"
```

`index.html` incluye `<script src="/config.js"></script>` antes del bundle.

### 17.3 Tamaños esperados

- Imagen Docker final: ~20 MB.
- Bundle JS gzipped inicial: ~250 KB.
- Bundle por feature (lazy-loaded): 50–100 KB cada uno.
- Tiempo de bootstrap esperado en 3G: < 5 s para chat básico interactivo.

---

## 18. Lifecycle de bootstrap

```
1. Browser carga index.html
2. Browser carga /config.js → window.__APP_CONFIG__
3. main.tsx ejecuta:
   ├── inicializa Sentry (si SENTRY_DSN)
   ├── inicializa OpenTelemetry (si OTEL_EXPORTER_OTLP_ENDPOINT)
   ├── inicializa i18next con IDIOMA_DEFAULT
   └── monta <App />
4. <App /> hace GET /auth/me
   ├── 200 → tiene JWT válido → GET /capabilities
   └── 401 → flujo de login (IdP externo o IAM interno según AUTH_MODE)
5. Con /capabilities OK:
   ├── aplica /capabilities.ui (CSS vars, títulos, asistentes)
   ├── llama GET /usuario/preferencias
   ├── llama GET /conversaciones (paginada, primera página)
   ├── inicia conexión SSE con /kpis si modulos.kpis.enabled
   └── renderiza la vista inicial (chat o dashboard según preferencia)
6. Polling de capabilities:
   ├── cualquier respuesta con X-Capabilities-Version distinto refetchea
   └── opcional: polling cada 15 min
```

**Modo degradado**: si `/capabilities` falla, la UI muestra solo chat
contra el módulo central, con banner de "configuración no disponible". Si
también falla la auth, redirige al login con mensaje claro.

---

## 19. Eventos y handlers principales

| Trigger | Handler | Efecto |
|---------|---------|--------|
| Enter en textarea de chat | `sendMessage()` | `POST /conversaciones/{id}/mensajes`, renderiza respuesta + artefactos |
| Click en sugerencia precargada | `applySuggestion()` | Llena input, opcionalmente envía si tiene `auto: true` |
| Click en plantilla con `grafico_rule_id` | `sendWithHint()` | Envía mensaje con hint, espera artefacto `serie_temporal` |
| Cambio de ventana en gráfico | `refreshChartWindow()` | Llama endpoint de refresh sin LLM, reemplaza puntos |
| Click en "Confirmar" en `accion_propuesta` | `confirmarAccion()` | `POST /accion`, muestra resultado |
| Cambio de rol/usuario en sidebar | `onRolChange()` | Re-fetch `/capabilities`, re-render |
| Selección de idioma | `cambiarIdioma()` | Update preferencias, re-fetch `/capabilities?lang=`, recarga i18n |
| Onclick descarga | `downloadFile()` | base64 → Blob → URL.createObjectURL → `<a download>`, o URL firmada directa |
| Polling 30s | `pollearAlertas()` | `GET /alertas` (si endpoint existe), actualiza badge |

---

## 20. Apéndice — Snippets de referencia

### 20.1 Cliente HTTP con interceptor de refresh

```ts
async function fetchWithRefresh(url: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(url, { ...init, credentials: 'include' });
  if (res.status === 401) {
    const refresh = await fetch('/auth/refresh', {
      method: 'POST', credentials: 'include'
    });
    if (refresh.ok) {
      res = await fetch(url, { ...init, credentials: 'include' });
    } else {
      window.location.href = '/login';
      throw new Error('auth_failed');
    }
  }
  return res;
}
```

### 20.2 Aplicar capabilities a CSS vars

```ts
function applyCapabilities(caps: Capabilities) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', caps.ui.colores.primario);
  root.style.setProperty('--color-sidebar', caps.ui.colores.sidebar);
  root.style.setProperty('--color-accent',  caps.ui.colores.acento);
  document.title = caps.ui.titulo;
  if (caps.ui.favicon_url) {
    document.querySelector("link[rel~='icon']")?.setAttribute('href', caps.ui.favicon_url);
  }
}
```

### 20.3 SSE para KPIs

```ts
import { fetchEventSource } from '@microsoft/fetch-event-source';

await fetchEventSource(`${kpis.base_url}/stream?metricas=biomasa,fcr&centros=CTR-001`, {
  headers: { 'Authorization': `Bearer ${jwt}` }, // si cross-origin
  credentials: 'include',                          // si same-origin con cookies
  onmessage(event) {
    if (event.event === 'kpi_update') {
      const data = JSON.parse(event.data);
      kpisStore.actualizar(data.kpi_id, data.valor);
    }
  },
  onerror(err) {
    // fetch-event-source reintenta solo; loguear y continuar
  }
});
```

### 20.4 Dispatcher de artefactos con TypeScript exhaustivo

(Ver sección 6.5.)

---

## 21. Mapa de archivos clave (qué crear primero)

Sugerencia de orden de implementación para Claude Code:

1. `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`,
   `.env.example`, `Dockerfile`, `nginx.conf`, `entrypoint.sh`, `README.md`.
2. `src/main.tsx`, `src/App.tsx`, configuración i18n base, configuración Sentry/OTel.
3. `src/api/client.ts` con interceptor de refresh.
4. `src/api/types.ts` con discriminated unions de todos los artefactos.
5. `src/api/capabilities.ts` y `src/stores/capabilities.ts`.
6. `src/api/auth.ts` y flujos de login.
7. Layout base: TopBar, Sidebar, área principal.
8. `src/features/chat/` con dispatcher de artefactos y los componentes
   más comunes (`SerieTemporalCard`, `BannerCard`, `TextoMarkdown`).
9. `src/features/conversaciones/` con persistencia server-side.
10. `src/features/kpis/` con SSE.
11. `src/features/acciones/` con `accion_propuesta` y confirmación.
12. `src/features/reportes/` con descargas.
13. Tests unitarios e integración por feature.
14. Tests e2e con Playwright para flujos principales.
15. CI/CD: build, test, axe, npm audit, Trivy, push de imagen.

---

## 22. Productos hermanos fuera del alcance

| Producto | Estado | Cómo se relaciona con esta UI |
|----------|--------|-------------------------------|
| Admin UI | Spec separado, fuera de este documento | Edita la configuración runtime (`/capabilities.ui`, asistentes, sugerencias, branding). La customer UI consume cambios vía refresh de `/capabilities`. Sin endpoints compartidos en la UI. |
| Módulo central (RAG batch) | Implementado, repo separado | Backend principal. Esta UI consume sus endpoints según sección 4. |
| Módulos opcionales (Reportes, KPIs, Acciones) | Pueden estar implementados o no | Esta UI los detecta vía `/capabilities` y los muestra/oculta accordingly. |
| Interfaces de DevOps / observabilidad | Fuera del paquete comercial | Receptores de telemetría (OTel collector, Sentry server). Configurables vía env vars. |

---

## 23. Glosario

- **Artefacto**: estructura tipada que el LLM puede emitir en su respuesta
  (`serie_temporal`, `tabla`, `accion_propuesta`, etc.) y que la UI renderiza
  con un componente específico.
- **Capabilities**: estado runtime de qué tiene activo un cliente — módulos
  licenciados, configuración visual, permisos del usuario actual, tenant info.
- **Chunk-level RBAC**: control de acceso a la información donde el motor
  filtra qué chunks vectoriales puede usar el LLM en función de claims del
  JWT del usuario.
- **JWKS**: JSON Web Key Set. El módulo central publica claves públicas que
  los demás módulos usan para validar JWTs localmente.
- **Módulo central**: contenedor que ingresa datos desde el lakehouse al
  vector store y mediates todas las consultas con control de acceso.
- **Cliente / customer**: la empresa que licencia el producto. Usuarios del
  cliente acceden vía esta customer UI.
- **Tenant**: instancia lógica del producto para un cliente. En dedicated
  hay un tenant por deployment; en multi-tenant hay varios por deployment.

---

**Fin del documento.**

Para preguntas o ambigüedades durante la implementación, este documento es
la fuente de verdad inicial. Cualquier desviación o decisión nueva debe
documentarse en el `README.md` del repo o como nota al final de este `spec.md`.
