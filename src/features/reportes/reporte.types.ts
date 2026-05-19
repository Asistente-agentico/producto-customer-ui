import { z } from 'zod';

/**
 * Tipos compartidos del módulo Reportes (handoff M3 §7).
 *
 * Estas shapes son consumidas por:
 * - `src/api/reportes.ts` — Reporte.definition usa ReportDefinitionSchema.
 * - PR 2 (cliente HTTP) — el resto de los tipos se usan como response
 *   shapes de los endpoints US-02 a US-06.
 *
 * Todos los schemas usan `.passthrough()` a nivel hijo para tolerar
 * campos que el central V2 agregue en futuras versiones sin
 * romper el parsing.
 */

// ---------------------------------------------------------------------------
// ReportDefinition — definición pivot de un reporte
//
// Consumida por:
// - Reporte.definition (estado persistido del designer)
// - POST /reports/{id}/preview (US-03 · previsualización reactiva)
//
// Las 4 dropzones del designer (filtros · filas · columnas · valores)
// mapean a las 4 listas de esta shape.
// ---------------------------------------------------------------------------

export const ReportDefinitionFilterSchema = z
  .object({
    field_id: z.string(),
    op: z.string(),
    value: z.unknown(), // el operador determina el tipo concreto
  })
  .passthrough();

export const ReportDefinitionFieldSchema = z
  .object({
    field_id: z.string(),
    table_id: z.string(),
  })
  .passthrough();

export const ReportDefinitionValueSchema = z
  .object({
    field_id: z.string(),
    agg: z.string(), // 'sum'|'avg'|'count'|... abierto a operadores custom
  })
  .passthrough();

export const ReportDefinitionSchema = z
  .object({
    filters: z.array(ReportDefinitionFilterSchema).default([]),
    rows: z.array(ReportDefinitionFieldSchema).default([]),
    cols: z.array(ReportDefinitionFieldSchema).default([]),
    values: z.array(ReportDefinitionValueSchema).default([]),
  })
  .passthrough();

export type ReportDefinition = z.infer<typeof ReportDefinitionSchema>;

// ---------------------------------------------------------------------------
// Datamart — catálogo de hechos y dimensiones
//
// Consumido por:
// - GET /datamart (US-03 · panel izq del designer, filtrado por scope)
// ---------------------------------------------------------------------------

export const DatamartFieldSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(), // 'string'|'number'|'date'|'boolean'|...
    pii: z.boolean().optional(), // marcado visual de PII en el designer
  })
  .passthrough();

export const DatamartTableSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(['fact', 'dimension']),
    fields: z.array(DatamartFieldSchema).default([]),
  })
  .passthrough();

export const DatamartSchema = z
  .object({
    tables: z.array(DatamartTableSchema).default([]),
  })
  .passthrough();

export type Datamart = z.infer<typeof DatamartSchema>;

// ---------------------------------------------------------------------------
// PreviewPayload — response de POST /reports/{id}/preview (US-03)
// ---------------------------------------------------------------------------

export const PreviewPayloadSchema = z
  .object({
    columns: z.array(z.string()).default([]),
    rows: z.array(z.array(z.unknown())).default([]),
    total_rows: z.number().optional(),
    sample_size: z.number().optional(),
    truncated: z.boolean().optional(),
    generated_at: z.string().optional(),
  })
  .passthrough();

export type PreviewPayload = z.infer<typeof PreviewPayloadSchema>;

// ---------------------------------------------------------------------------
// PreflightResult — POST /reports/{id}/preflight (US-06)
//
// Cada check materializa una verificación previa a la aprobación:
// pivot ok, frecuencia definida, observaciones resueltas, PII detectada.
// ---------------------------------------------------------------------------

export const PreflightCheckSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    status: z.enum(['pass', 'fail', 'warn']),
    detail: z.string().optional(),
  })
  .passthrough();

export const PreflightResultSchema = z
  .object({
    checks: z.array(PreflightCheckSchema).default([]),
    can_approve: z.boolean(),
  })
  .passthrough();

export type PreflightResult = z.infer<typeof PreflightResultSchema>;

// ---------------------------------------------------------------------------
// TimelineEvent — GET /reports/{id}/timeline (US-04)
//
// Mismo shape canónico que el audit log del módulo Acciones (HU11
// de Modulo-Acciones-HU.md). En producción usa HMAC chain server-side
// (D2 + HU6.3 del repo `diseno`).
// ---------------------------------------------------------------------------

export const TimelineEventSchema = z
  .object({
    ts: z.string(),
    actor: z.string(), // 'sistema'|'usuario'|'LLM'|user_id
    accion: z.string(),
    detalle: z.string().optional(),
  })
  .passthrough();

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// ---------------------------------------------------------------------------
// Observation — POST/PATCH /reports/{id}/observations (US-04)
//
// Bitácora compartida del reporte. El log es inmutable: las
// observaciones no se editan ni se borran, solo se marcan resueltas.
// ---------------------------------------------------------------------------

export const ObservationSchema = z
  .object({
    id: z.string(),
    author: z.string(),
    role: z.string(),
    anchor: z.string().optional(), // referencia a campo del reporte
    text: z.string(),
    status: z.enum(['open', 'resolved']),
    created_at: z.string(),
    resolved_at: z.string().optional(),
    mentions: z.array(z.string()).optional(),
  })
  .passthrough();

export type Observation = z.infer<typeof ObservationSchema>;

// ---------------------------------------------------------------------------
// Role — GET /roles/assignable (US-06)
//
// Rol asignable a un reporte aprobado (visibilidad por RBAC).
// `jerarquia` permite filtrar roles iguales o inferiores al del
// aprobador (no asignar a roles superiores).
// ---------------------------------------------------------------------------

export const RoleSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    jerarquia: z.number().optional(),
  })
  .passthrough();

export type Role = z.infer<typeof RoleSchema>;
