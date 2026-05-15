# Diseño v2 — entregable de Claude Design

> Recibido: 2026-05-14.
> Origen: `ASIST_VIRTUAL_INTERFAZ.zip`.
> Estado: **referencia para implementación**, no es código del producto.

Esta carpeta contiene el entregable v2.0 de Claude Design: un prototipo de
referencia "Omelette" en JSX + HTML, los specs internos del equipo de
diseño, y los handoffs. Sirve como **fuente del Look & Feel + UX** que la
customer UI debe adoptar, sin reemplazar el contrato técnico ya
implementado en el repo.

## Cómo se relaciona con el resto del repo

| Documento | Rol | Relación con esta carpeta |
|---|---|---|
| [`docs/spec.md`](../spec.md) | Fuente de verdad del contrato técnico | El handoff v2 mapea sección por sección y propone deltas |
| [`docs/plan.md`](../plan.md) | Plan H0–H12 implementado | Cerrado. El plan de los 11 PRs del handoff v2 es la siguiente iteración |
| [`docs/handoff-design.md`](../handoff-design.md) | Brief actual para iteradores de diseño | Complementario. El handoff v2 lo extiende con paleta, tipografía, UX firme |
| [`uploads/customer_ui_spec.md`](uploads/customer_ui_spec.md) | Copia del spec original | **Idéntica** a `docs/spec.md`. Conservada por integridad del entregable |

## Qué leer primero

1. **[`specs/Handoff-Final-ClaudeCode.md`](specs/Handoff-Final-ClaudeCode.md)** — documento principal. Mapea sección por sección el spec del repo contra las decisiones del prototipo y propone 11 PRs para aplicar el v2.0.
2. **`Overview.html`** — vista panorámica de las 14 pantallas (abrir en navegador).
3. **`state.jsx`** — mock de capabilities + ámbitos + KPIs con la shape esperada para el central V2.
4. **`view-actions.jsx`** — flujo de acciones simplificado sin doble custodia (alto impacto en el módulo de acciones del repo).
5. **`uploads/LLM_usuario.md`** — contexto adicional sobre el rol del LLM frente al usuario.

## Cambios al contrato HTTP que el handoff v2 pide

(Resumen — detalle en `specs/Handoff-Final-ClaudeCode.md` §2 y §7)

- `capabilities.usuario.email_institucional` — NUEVO (del JWT)
- `capabilities.usuario.idioma` — NUEVO
- `capabilities.ambitos_autorizados[]` — NUEVO
- `/conversaciones` con `ambito_id` y `created_at`
- `metadata.ambito_id` en respuestas de mensajes
- `/acciones` simplificado (sin `/solicitar-aprobacion` ni `/aprobar`)
- `accion_propuesta.riesgo` eliminado
- `accion_propuesta` solo `ENVIAR_CORREO` y `AGENTE_IA`
- `accion_propuesta.permiso_requerido` nuevo

## Cambios visuales firmes

- TopBar 48px con cluster `Chat · ML · Reportes · Acciones · on-line`
- Sidebar solo en Chat (288px, navy `#0A2540`), ámbitos → semanas → temáticas
- KpiBand colapsable (fondo `#FFFCF5`)
- Reportes gerencia-aware sin sidebar
- Acciones sin doble custodia, "+ Nueva" con 2 pestañas
- Mensajes del chat colapsables individualmente
- Footer "Powered by OPCiber · © 2026" en todas las páginas
- Sin scope chips en composer

## Paleta y tipografías

```css
--navy: #0A2540    --coral: #E85C3C   --paper: #FAFAF7
--cream: #F2EEDF   --rule: #EDEAE0    --ink: #0A0A0A
--ink2: #5C5C5C    --ink3: #9A958B
--ok: #2D7D6F      --warn: #B8860B    --cream-band: #FFFCF5
```

Tipografías bundleadas (sin CDN, cloud-agnóstico):
- **Fraunces** — titulares (optical-sizing)
- **Plus Jakarta Sans** — UI
- **JetBrains Mono** — datos / IDs / timestamps

## Lo que NO se debe tocar al aplicar v2.0

Documentado en `specs/Handoff-Final-ClaudeCode.md` §5 y replicado aquí
para visibilidad:

1. Discriminated unions con `tipo` literal en `src/api/types.ts`.
2. `passthrough()` solo a nivel hijo, no root.
3. CSS vars desde `/capabilities` (no migrar a Tailwind theme custom).
4. Lazy load por artefacto.
5. Cliente HTTP con interceptor refresh 401.
6. Los 48 tests existentes (actualizar junto al markup, no eliminar).

## Inventario de archivos

```
diseno-v2/
├── README.md                      # este archivo
├── index.html, Overview.html      # shell y vista panorámica
├── *.jsx (16 archivos)            # prototipo Omelette
├── specs/
│   ├── Handoff-Final-ClaudeCode.md     # principal (v2.0)
│   ├── Handoff-ClaudeCode.md           # versión previa
│   ├── Especificacion-actual.md        # spec interno del equipo
│   └── Especificaciones-repo-actual.md # spec interno del repo
└── uploads/
    ├── customer_ui_spec.md        # copia idéntica del spec del repo
    └── LLM_usuario.md             # rol del LLM frente al usuario
```
