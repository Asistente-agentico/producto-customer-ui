# producto-customer-ui

Interfaz de usuario customer-facing del producto comercial. Aplicación web
responsiva (chat + dashboards + acciones) que consume el módulo central
(RAG batch) y los módulos opcionales (Reportes, KPIs streaming, Acciones).

> Producto distinto del **admin UI** (gestión de tenants/licencias/runtime
> config) y del **módulo central**. Este repo solo cubre la customer UI.

## Documentación

- [`docs/spec.md`](docs/spec.md) — fuente de verdad del diseño. Stack,
  contrato HTTP, modelo de configuración, catálogo de artefactos, i18n,
  seguridad, accesibilidad, empaquetado Docker.
- [`docs/plan.md`](docs/plan.md) — plan de implementación: fases, hitos,
  riesgos, ambigüedades.

## Relación con otros repos

- **Módulo central (RAG batch)** — repositorio local en `C:\Users\karin\sistema_rag`
  (FastAPI + Python). Aún no está publicado en GitHub. La customer UI lo
  consume vía HTTP según el contrato del spec (sección 4).

  El central actual (V1) **no implementa todavía** el contrato HTTP que el
  customer UI necesita (faltan `/capabilities`, `/conversaciones/{id}`,
  `/auth/*`, JWT en cookies HttpOnly, formato uniforme de errores) y está
  acoplado a GCP. La integración real depende de un sprint posterior de
  evolución del backend. Mientras tanto se desarrolla contra **MSW (Mock
  Service Worker)** con mocks que reflejan 1:1 el contrato del spec.

- **Admin UI** — producto hermano, fuera de este repo.

## Convenciones adoptadas del módulo central

Para mantener coherencia entre frontend y backend:

- **JSON**: `snake_case` en todos los campos.
- **Timestamps**: ISO 8601 con TZ (`2026-05-13T14:23:00Z`).
- **Idioma de campos**: español neutro (`consulta`, `respuesta`,
  `usuario_id`, `chunks_used`).
- **Dominio configurable**: el central define el dominio activo en
  `config/domain*.yaml` y lo expone — la UI lo recibe en
  `/capabilities.ui` (no hardcodear dominio en la UI).

## Estado

🟡 Esperando aprobación del `docs/plan.md` antes de iniciar implementación.

## Licencia

Propietario — uso interno de Asistente-agentico.
