# Deuda técnica · producto-customer-ui

> Hallazgos detectados durante UAT y revisión de specs que **no se
> implementaron** en los PRs porque tienen un bloqueador técnico,
> requieren una decisión externa, o se decidió deferirlos. Cada
> entrada documenta **qué dice la spec**, **qué hay hoy en el repo**,
> el **bloqueador / razón**, y **cómo cerrarse**.
>
> Este doc se actualiza cada vez que el UAT detecta un delta entre
> spec y código, antes de pasar al siguiente bloque del test.

---

## Convenciones

- **ID**: `DT-NN` secuencial (cero-padded).
- **Estado**: `abierta` · `en análisis` · `bloqueada` · `cerrada`.
- **Prioridad**: `alta` (rompe UX o política firme) · `media` (polish
  importante) · `baja` (cosmético / nice-to-have).
- **Origen**: PR o UAT que lo detectó.

---

## Índice

| ID | Título | Estado | Prioridad | Origen |
|---|---|---|---|---|
| DT-01 | Panel lateral del Login con copy + módulos contratados | abierta | media | UAT · bloque A1 |

---

## DT-01 · Panel lateral del Login con copy + módulos contratados

**Origen**: UAT — revisión de specs durante bloque A (Login).
**PR relacionado**: PR 9 (Login + Bootstrap splash).
**Estado**: abierta.
**Prioridad**: media (es polish + valor comercial; no bloquea autenticarse).

### Lo que dice la spec

El prototipo Omelette (`docs/diseno-v2/view-kpis-and-auth.jsx` líneas
27–67) define un Login con **dos columnas lado a lado**:

#### Panel izquierdo (44% ancho · navy · oculto en mobile)

Tres bloques verticales:

1. **Brand arriba**:
   - Logo cuadrado
   - "Tu Asistente Asistente Virtual" (Fraunces 15 px)
   - "tu apoyo operativo" (mono-label cream/55)

2. **Mensaje central**:
   - Título Fraunces 42 px: *"Una sola interfaz, todos tus módulos."*
   - Copy 15 px cream/70 (max-w-420):
     > "Conversa con tus datos productivos, anclá indicadores en
     > vivo, genera reportes y ejecuta acciones — todo dentro de los
     > permisos que tu organización te asigna."

3. **Sección "módulos contratados"**:
   - mono-label cream/55: "módulos contratados"
   - Grid 2×2 con tarjetas cream/.10 sobre navy mostrando los módulos
     **opcionales habilitados por el tenant** (filtrados con
     `isEnabled(m.id)`): KPIs, Machine Learning, Reportes, Acciones.

#### Panel derecho (form)

- mono-label arriba del título: dominio del tenant
  (`salmones-antartica.cl`)
- H2 Fraunces 28 px: "Iniciar sesión"
- Subtítulo 13.5 px: *"Bienvenido. Tus permisos se cargan tras
  autenticarte."*
- Form (modo `iam_interno`):
  - Campo **"Correo corporativo"** (type=email · NO "Usuario")
  - Campo Contraseña
  - Checkbox "Recordarme 30 días" (default checked)
  - Link "Olvidé mi clave"
  - Botón "Continuar" (coral, ancho completo)
- O alternativa (modo `idp_externo`):
  - Botón único "Continuar con Microsoft Entra" + icono external

### Estado actual en el repo (PR 9)

Versión **minimalista** sin panel lateral:

- Form único centrado verticalmente sobre `bg-paper`.
- `ModulosPreview` (`src/features/auth/ModulosPreview.tsx`): cluster
  **horizontal** de 5 chips neutros (Chat · ML · Reportes · Acciones ·
  on-line) **debajo del botón** de submit, todos del mismo estilo
  (sin diferenciar habilitado / no habilitado).
- Campo "Usuario" (no email).
- Sin: panel lateral navy, sin copy descriptivo, sin dominio del
  tenant, sin "Recordarme 30 días", sin "Olvidé mi clave", sin
  diferenciación visual de los 4 módulos opcionales.

### Bloqueador / Razón

**Pre-login no hay `capabilities` cargadas.** La UI no sabe:

- **Qué módulos opcionales contrató el tenant** (para filtrar el grid
  con `isEnabled(m.id)`).
- **Qué dominio mostrar** arriba del form (`salmones-antartica.cl` en
  el prototipo).
- **Qué branding aplicar** al panel navy (logo, colores específicos
  del tenant).

El prototipo Omelette lo resuelve con `MOCK_CAPS` estático en
`state.jsx` que está siempre disponible. En producción, esa
información debe venir de algún lado **antes** del POST /auth/login,
y el contrato HTTP actual (`docs/spec.md` §4) no expone ningún
endpoint público pre-auth.

Como consecuencia, durante PR 9 se eligió la versión minimalista para
no inventar un contrato HTTP que el equipo de backend no aprobó.

### Resolución propuesta

#### Opción A · Endpoint público `GET /capabilities/preview` (recomendada)

El central V2 expone un endpoint **sin autenticación** que devuelve
un subset reducido de capabilities:

```json
{
  "tenant": {
    "dominio": "salmones-antartica.cl",
    "nombre": "Salmones Antártica",
    "region": "Región X · Los Lagos"
  },
  "ui": {
    "titulo": "Asistentes Virtuales",
    "logo_letras": "SA",
    "colores": { "navy": "#0A2540", "coral": "#E85C3C" }
  },
  "modulos_contratados": ["central", "kpis", "reportes", "acciones"]
}
```

La UI lo llama al cargar `/login` y popula el panel izquierdo
completo. Permisos del usuario siguen viniendo en `/capabilities`
post-auth.

**Riesgo**: información básica del tenant queda visible
públicamente. Aceptable si el tenant ya es identificable por host
(ej. subdominio dedicated). Política de organización debería avalar.

#### Opción B · Resolución desde `window.location.hostname`

La UI usa el host del browser para inferir el tenant, y un config
Capa 2 (env var inyectada en `entrypoint.sh`) define los módulos
contratados de ese deployment:

```
LOGIN_TENANT_DOMINIO=salmones-antartica.cl
LOGIN_TENANT_NOMBRE="Salmones Antártica"
LOGIN_MODULOS_CONTRATADOS=central,kpis,reportes,acciones
```

**Pros**: simple, sin endpoints nuevos.
**Contras**: requiere redeploy si cambia el catálogo del tenant; no
funciona en multi-tenant compartido sin trucos de hostname.

#### Opción C · Mock estático pre-login + revelar post-auth

La UI muestra los 5 nombres de módulos como cards neutras (sin
indicar habilitación). Post-login, el bootstrap splash actualiza el
panel revelando cuáles están realmente habilitados (esto ya pasa
implícitamente porque el sidebar/TopBar post-login los muestra).

**Pros**: no requiere backend ni env vars nuevas.
**Contras**: el usuario no sabe pre-login si su tenant tiene los
módulos que necesita. Perdemos el valor informativo y comercial del
panel ("mirá todo lo que tu organización te dio acceso").

### Decisión pendiente

1. ¿Es aceptable para la política de la organización exponer un
   endpoint público `GET /capabilities/preview` (Opción A)?
2. Si no, ¿usamos Opción B (env vars) o Opción C (mock estático)?
3. Mientras se decide, ¿implementamos Opción C como placeholder
   visual del panel izquierdo (sin función real)?

### Mientras no se resuelva

El Login funciona pero pierde:
- Branding institucional fuerte pre-auth.
- Valor comercial (mostrar al usuario qué módulos vienen incluidos
  antes de loguearse).
- Detalles UX: dominio del tenant arriba del form, "Recordarme 30
  días", "Olvidé mi clave".

**Riesgo de no resolverlo**: bajo. Es polish visual + UX. La
funcionalidad core (autenticarse) está completa y es accesible.

---

**Fin del documento.** Próximas entradas a medida que el UAT detecte
más deltas.
