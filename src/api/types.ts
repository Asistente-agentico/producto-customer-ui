// Contrato HTTP — tipos y schemas (sección 4 y 6 del spec).
//
// Reglas:
// - Toda respuesta del backend pasa por z.safeParse; campos desconocidos
//   se toleran (forward compat) gracias a .passthrough() donde aplica.
// - Artefactos: discriminated union sobre `tipo`; si un artefacto no
//   matchea ningún tipo conocido (o falla el parseo), se envuelve en
//   { tipo: 'desconocido', _raw } para que el dispatcher renderice
//   UnknownArtifactPlaceholder sin crashear.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Errores (sección 4.10)
// ---------------------------------------------------------------------------

export const ErrorPayloadSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }),
  })
  .passthrough();

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export const ERROR_CODES = [
  'RBAC_DENIED',
  'VALIDATION_ERROR',
  'LLM_BLOCKED',
  'AUTH_FAILED',
  'UPGRADE_REQUIRED',
  'BACKEND_DOWN',
  'MAINTENANCE',
] as const;
export type KnownErrorCode = (typeof ERROR_CODES)[number];

// ---------------------------------------------------------------------------
// Auth (sección 4.1)
// ---------------------------------------------------------------------------

export const AuthMeSchema = z
  .object({
    id_pseudo: z.string(),
    rol: z.string(),
    gerencia: z.string().optional(),
    permisos: z.array(z.string()).default([]),
  })
  .passthrough();

export type AuthMe = z.infer<typeof AuthMeSchema>;

// ---------------------------------------------------------------------------
// Capabilities (sección 4.2)
// ---------------------------------------------------------------------------

export const CapabilitiesUiSchema = z
  .object({
    titulo: z.string().optional(),
    subtitulo: z.string().optional(),
    logo_url: z.string().optional(),
    favicon_url: z.string().optional(),
    icono_sistema: z.string().optional(),
    icono_emoji: z.string().optional(),
    // PR 0: alias del v2.0 — `logo_letras` reemplaza a `icono_sistema`
    // pero ambos siguen aceptándose. `applyCapabilities` prefiere
    // `logo_letras` si está presente.
    logo_letras: z.string().optional(),
    colores: z
      .object({
        // Spec v1.x — alias mantenidos para retro-compat.
        primario: z.string().optional(),
        sidebar: z.string().optional(),
        acento: z.string().optional(),
        // Spec v2.0 — paleta semántica del prototipo Omelette.
        // El consumidor (`applyCapabilities`) prefiere los nombres v2
        // si están presentes y cae a los v1 si no.
        navy: z.string().optional(),
        coral: z.string().optional(),
        paper: z.string().optional(),
        cream: z.string().optional(),
        rule: z.string().optional(),
        ink: z.string().optional(),
        ok: z.string().optional(),
        warn: z.string().optional(),
        cream_band: z.string().optional(),
      })
      .partial()
      .optional(),
    etiquetas: z.record(z.string()).optional(),
    botones: z.record(z.string()).optional(),
    placeholders: z.record(z.string()).optional(),
    mensajes: z.record(z.string()).optional(),
    flags: z.record(z.boolean()).optional(),
    asistentes: z
      .array(
        z
          .object({
            id: z.string(),
            nombre: z.string(),
            subtitulo: z.string().optional(),
            ambitos: z.array(z.string()).default([]),
            disabled: z.boolean().optional(),
          })
          .passthrough(),
      )
      .optional(),
    consultas_sugeridas: z.record(z.array(z.string())).optional(),
    entidades_principales: z
      .array(
        z
          .object({
            nombre: z.string(),
            identificador: z.string(),
            regex: z.string().optional(),
            prefijo_display: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export const ModuloConfigSchema = z
  .object({
    enabled: z.boolean(),
    base_url: z.string().optional(),
    features: z.array(z.string()).optional(),
    razon: z.string().optional(),
  })
  .passthrough();

// PR 5 cleanup · sub-config específica del módulo Reportes con el
// intervalo de polling de la bandeja. `refresh_interval_seconds` cae
// a 30 si el central no lo emite. Si `inbox` está ausente, la UI
// también usa 30 (default operacional).
export const ModuloReportesConfigSchema = ModuloConfigSchema.extend({
  inbox: z
    .object({
      refresh_interval_seconds: z.number().default(30),
    })
    .optional(),
});
export type ModuloReportesConfig = z.infer<typeof ModuloReportesConfigSchema>;

// PR 0: snapshot inicial de KPI configurado por usuario (banda inline
// del prototipo Omelette). Diferenciado del SSE del dashboard:
// estos son los KPIs *configurados* del usuario; el stream actualiza
// los valores en vivo.
export const KpiConfiguradoSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    value: z.union([z.string(), z.number()]).optional(),
    delta: z.string().optional(),
    severity: z.enum(['ok', 'warn', 'bad']).optional(),
    chart: z.enum(['line', 'bar', 'gauge', 'progress']).optional(),
    subtitle: z.string().optional(),
    series: z.array(z.number()).optional(),
    bars: z.array(z.tuple([z.string(), z.number(), z.number()])).optional(),
    target: z
      .object({
        lo: z.number().optional(),
        hi: z.number().optional(),
        label: z.string().optional(),
      })
      .optional(),
    gaugeValue: z.number().optional(),
    gaugeMin: z.number().optional(),
    gaugeMax: z.number().optional(),
    gaugeTarget: z.number().optional(),
    progress: z.object({ value: z.number(), target: z.number() }).optional(),
    stats: z.array(z.tuple([z.string(), z.string()])).optional(),
  })
  .passthrough();

export type KpiConfigurado = z.infer<typeof KpiConfiguradoSchema>;

// PR 0: filtro JWT visible para auditoría — el central V2 lo expone en
// capabilities.usuario.filtros_jwt (antes solo aparecía en
// metadata.permisos_aplicados.filtros_jwt_aplicados por mensaje).
export const FiltroJwtSchema = z
  .object({
    campo: z.string(),
    valor: z.string(),
    aplica_a: z.string().optional(),
  })
  .passthrough();

// PR 0: items bloqueados que la UI muestra como tales (KPIs con
// candado, acciones grises). Razón legible.
export const ItemBloqueadoSchema = z
  .object({
    tipo: z.string(),
    nombre: z.string(),
    razon: z.string().optional(),
  })
  .passthrough();

// PR 0: ámbito autorizado del usuario — derivado de rol + gerencia en
// el central. Lista plana de slugs.
export const AmbitoAutorizadoSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
  })
  .passthrough();

export type AmbitoAutorizado = z.infer<typeof AmbitoAutorizadoSchema>;

// PR 0: asistente_activo singular del v2.0. Coexiste con ui.asistentes[]
// hasta que se resuelva Q6 (asistente único vs múltiples).
export const AsistenteActivoSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    subtitulo: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

export const CapabilitiesSchema = z
  .object({
    version: z.string(),
    hash: z.string().optional(),
    tenant: z
      .object({
        id: z.string(),
        nombre: z.string().optional(),
        expira: z.string().optional(),
        // PR 0: campos v2.0.
        dominio: z.string().optional(),
        region: z.string().optional(),
      })
      .passthrough(),
    usuario: z
      .object({
        id_pseudo: z.string(),
        rol: z.string(),
        gerencia: z.string().optional(),
        permisos: z.array(z.string()).default([]),
        // PR 0: campos v2.0 — todos opcionales para retro-compat.
        nombre: z.string().optional(),
        iniciales: z.string().optional(),
        rol_id: z.string().optional(),
        email_institucional: z.string().email().optional(),
        idioma: z.string().optional(),
        filtros_jwt: z.array(FiltroJwtSchema).optional(),
        bloqueados: z.array(ItemBloqueadoSchema).optional(),
        kpis_configurados: z.array(KpiConfiguradoSchema).optional(),
      })
      .passthrough(),
    modulos: z
      .object({
        central: ModuloConfigSchema,
        reportes: ModuloReportesConfigSchema.optional(),
        kpis: ModuloConfigSchema.optional(),
        acciones: ModuloConfigSchema.optional(),
        // PR 0: módulo ML del v2.0.
        ml: ModuloConfigSchema.optional(),
      })
      .passthrough(),
    ui: CapabilitiesUiSchema,
    llm: z
      .object({
        provider: z.string().optional(),
        model: z.string().optional(),
        features: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    // PR 0: campos v2.0 top-level.
    asistente_activo: AsistenteActivoSchema.optional(),
    ambitos_autorizados: z.array(AmbitoAutorizadoSchema).optional(),
  })
  .passthrough();

export type Capabilities = z.infer<typeof CapabilitiesSchema>;
export type CapabilitiesUi = z.infer<typeof CapabilitiesUiSchema>;
export type ModuloConfig = z.infer<typeof ModuloConfigSchema>;

// ---------------------------------------------------------------------------
// Artefactos (sección 6)
// ---------------------------------------------------------------------------

const ColorSemantico = z.enum(['rojo', 'verde', 'amarillo', 'azul', 'gris']);

export const SerieTemporalSchema = z
  .object({
    tipo: z.literal('serie_temporal'),
    version: z.literal(1),
    grafico_rule_id: z.string().optional(),
    titulo: z.string(),
    subtitulo: z.string().optional(),
    ventana_actual: z.string().optional(),
    ventanas_disponibles: z.array(z.string()).optional(),
    unidad_y: z.string().optional(),
    puntos: z.array(
      z
        .object({
          x: z.union([z.string(), z.number()]),
          y: z.number(),
          color: ColorSemantico.optional(),
        })
        .passthrough(),
    ),
    rango_objetivo_y: z
      .object({
        y_min: z.number(),
        y_max: z.number(),
        etiqueta: z.string().optional(),
      })
      .optional(),
    metricas_resumen: z
      .record(
        z
          .object({
            etiqueta: z.string(),
            valor: z.union([z.string(), z.number()]),
            unidad: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export const TablaSchema = z
  .object({
    tipo: z.literal('tabla'),
    version: z.literal(1),
    titulo: z.string().optional(),
    columnas: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          tipo: z.enum(['string', 'number', 'date', 'boolean']).default('string'),
        })
        .passthrough(),
    ),
    filas: z.array(z.record(z.unknown())),
    sortable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    paginate_at: z.number().optional(),
  })
  .passthrough();

export const TableroKpiSchema = z
  .object({
    tipo: z.literal('tablero_kpi'),
    version: z.literal(1),
    titulo: z.string().optional(),
    subtitulo: z.string().optional(),
    kpis: z.array(
      z
        .object({
          id: z.string(),
          etiqueta: z.string(),
          valor: z.union([z.string(), z.number()]).optional(),
          color: ColorSemantico.optional(),
          target: z.union([z.string(), z.number()]).optional(),
          delta: z.string().optional(),
          delta_tipo: z.enum(['positivo', 'negativo', 'neutro']).optional(),
          descripcion: z.string().optional(),
          bloqueado: z.boolean().optional(),
          mensaje: z.string().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const ImagenSchema = z
  .object({
    tipo: z.literal('imagen'),
    version: z.literal(1),
    url: z.string(),
    alt: z.string(),
    ancho_max: z.number().optional(),
  })
  .passthrough();

export const BannerSchema = z
  .object({
    tipo: z.literal('banner'),
    version: z.literal(1),
    variante: z.enum(['info', 'warning', 'error', 'success', 'causal', 'mantenimiento']),
    mensaje: z.string(),
    severidad: z.enum(['baja', 'media', 'alta']).optional(),
    icono: z.string().optional(),
    accion_opcional: z
      .object({
        label: z.string(),
        url: z.string(),
      })
      .optional(),
  })
  .passthrough();

export const ProgresoSchema = z
  .object({
    tipo: z.literal('progreso'),
    version: z.literal(1),
    operacion_id: z.string(),
    porcentaje: z.number().min(0).max(100),
    etapa: z.string().optional(),
    completado: z.boolean(),
  })
  .passthrough();

// Schema v2 (Q4 + Q5 + Q11). El artefacto `accion_propuesta` que el
// LLM emite en el chat es un STUB que navega a /acciones — la
// confirmación, edición y ejecución viven en el módulo Acciones.
//
// Eliminados: `riesgo`, `requiere_confirmacion` (Q4).
// Agregado: `permiso_requerido` para AGENTE_IA (RBAC visual).
// `id_propuesta` ahora es también el `id` de la acción persistida
// server-side; navegar a /acciones/:id_propuesta abre el detalle.
export const AccionPropuestaSchema = z
  .object({
    tipo: z.literal('accion_propuesta'),
    version: z.literal(1),
    tipo_accion: z.enum(['ENVIAR_CORREO', 'AGENTE_IA']),
    id_propuesta: z.string(),
    titulo: z.string().optional(),
    sub: z.string().optional(),
    parametros: z.record(z.unknown()),
    permite_edicion: z.array(z.string()).default([]),
    permiso_requerido: z.string().optional(),
  })
  .passthrough();

/**
 * @deprecated Q11 · política de salida de datos (regla firme inmutable).
 *
 * El artefacto `archivo_descargable` queda **fuera** del catálogo de
 * artefactos renderizables. El módulo Reportes es el único canal de
 * salida de datos del Asistente al PC del usuario o a cualquier destino
 * externo. Si un mensaje histórico trae este tipo, el dispatcher lo
 * trata como `UnknownArtifactPlaceholder` (no se renderiza descarga).
 *
 * Se mantiene el schema export por si código legacy lo referencia, pero
 * NO está en `KnownArtefactoSchema` (la discriminated union), por lo
 * que nunca se renderiza con su componente original.
 */
export const ArchivoDescargableSchema = z
  .object({
    tipo: z.literal('archivo_descargable'),
    version: z.literal(1),
    nombre_archivo: z.string(),
    mime_type: z.string(),
    modo: z.enum(['base64_inline', 'url_firmada']),
    base64_contenido: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    tamano_bytes: z.number().optional(),
  })
  .passthrough();

export const FormularioCampoSchema = z
  .object({
    nombre: z.string(),
    label: z.string(),
    tipo: z.enum(['text', 'number', 'date', 'select', 'multiselect', 'textarea', 'checkbox']),
    requerido: z.boolean().optional(),
    opciones: z
      .array(
        z.object({
          value: z.string(),
          label: z.string(),
        }),
      )
      .optional(),
    placeholder: z.string().optional(),
    valor_default: z.unknown().optional(),
  })
  .passthrough();

export const FormularioSchema = z
  .object({
    tipo: z.literal('formulario'),
    version: z.literal(1),
    titulo: z.string().optional(),
    campos: z.array(FormularioCampoSchema),
    submit_label: z.string().optional(),
    destino: z.string().optional(),
  })
  .passthrough();

export const SeleccionSchema = z
  .object({
    tipo: z.literal('seleccion'),
    version: z.literal(1),
    pregunta: z.string(),
    opciones: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    ),
    multi: z.boolean().default(false),
  })
  .passthrough();

export const KnownArtefactoSchema = z.discriminatedUnion('tipo', [
  SerieTemporalSchema,
  TablaSchema,
  TableroKpiSchema,
  ImagenSchema,
  BannerSchema,
  ProgresoSchema,
  AccionPropuestaSchema,
  // Q11 · ArchivoDescargableSchema removido deliberadamente del catálogo
  // renderizable. Si llega como artefacto, cae a UnknownArtifactPlaceholder.
  FormularioSchema,
  SeleccionSchema,
]);

export type KnownArtefacto = z.infer<typeof KnownArtefactoSchema>;
export type ArtefactoTipo = KnownArtefacto['tipo'];

export type UnknownArtefacto = {
  tipo: 'desconocido';
  _raw: unknown;
  _reason: 'tipo_no_reconocido' | 'parse_error';
};

export type Artefacto = KnownArtefacto | UnknownArtefacto;

/**
 * Parsea un artefacto tolerando tipos/shapes desconocidos.
 * Nunca lanza: retorna UnknownArtefacto si no matchea ningún schema.
 */
export function parseArtefacto(value: unknown): Artefacto {
  const result = KnownArtefactoSchema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  // Distinguir "tipo desconocido" de "tipo conocido pero shape mala"
  // para diagnóstico y logging.
  const hasKnownTipo =
    typeof value === 'object' &&
    value !== null &&
    'tipo' in value &&
    typeof (value as { tipo?: unknown }).tipo === 'string' &&
    (KnownArtefactoSchema.options as Array<{ shape: { tipo: { value: string } } }>).some(
      (opt) => opt.shape.tipo.value === (value as { tipo: string }).tipo,
    );
  return {
    tipo: 'desconocido',
    _raw: value,
    _reason: hasKnownTipo ? 'parse_error' : 'tipo_no_reconocido',
  };
}

// ---------------------------------------------------------------------------
// Mensajes / Conversaciones (sección 4.3)
// ---------------------------------------------------------------------------

export const MensajeMetadataSchema = z
  .object({
    chunks_used: z.number().optional(),
    scopes: z.array(z.string()).optional(),
    ambiguous_routing: z.boolean().optional(),
    permisos_aplicados: z
      .object({
        rol: z.string().optional(),
        filtros_jwt_aplicados: z.array(z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// No usamos .passthrough() acá: causaba que Omit perdiera la narrowing
// de los campos conocidos. Si el central agrega campos nuevos,
// safeParse los descarta (no es un problema porque son metadata
// y no afectan rendering).
export const MensajeResponseRawSchema = z.object({
  mensaje_id: z.string(),
  respuesta: z.string(),
  artefactos: z.array(z.unknown()).default([]),
  metadata: MensajeMetadataSchema.optional(),
  blocked: z.boolean().default(false),
  error: z.string().nullable().optional(),
});

export type MensajeResponseRaw = z.infer<typeof MensajeResponseRawSchema>;

export type MensajeResponse = {
  mensaje_id: string;
  respuesta: string;
  artefactos: Artefacto[];
  metadata?: MensajeMetadata;
  blocked: boolean;
  error?: string | null;
};

export type MensajeMetadata = z.infer<typeof MensajeMetadataSchema>;

export function normalizeMensajeResponse(raw: MensajeResponseRaw): MensajeResponse {
  return {
    ...raw,
    artefactos: raw.artefactos.map(parseArtefacto),
  };
}

export const MensajeRequestSchema = z
  .object({
    texto: z.string().min(1).max(2000),
    asistente_id: z.string().optional(),
    hints: z.record(z.string()).optional(),
  })
  .passthrough();

export type MensajeRequest = z.infer<typeof MensajeRequestSchema>;

export const ConversacionListItemSchema = z
  .object({
    id: z.string(),
    titulo: z.string(),
    asistente_id: z.string().optional(),
    // PR 4 · ámbito del sidebar (handoff §3.3 + Q2). El central V2 lo
    // emite calculado server-side; mientras tanto la UI lo detecta
    // con `detectAmbito` y lo persiste al crear la conversación.
    ambito_id: z.string().optional(),
    creado_en: z.string(),
    actualizado_en: z.string().optional(),
  })
  .passthrough();

export type ConversacionListItem = z.infer<typeof ConversacionListItemSchema>;

export const ConversacionListResponseSchema = z
  .object({
    items: z.array(ConversacionListItemSchema),
    next_cursor: z.string().nullable().optional(),
  })
  .passthrough();

export type ConversacionListResponse = z.infer<typeof ConversacionListResponseSchema>;

// Mensajes ya emitidos en una conversación (al cargar historial).
// El central distingue mensajes del usuario y del asistente; cada uno
// tiene su shape:
//   - usuario: { rol: 'user', texto, ts }
//   - asistente: response completo del LLM
export const MensajeHistorialSchema = z.union([
  z
    .object({
      rol: z.literal('user'),
      texto: z.string(),
      ts: z.string(),
    })
    .passthrough(),
  z
    .object({
      rol: z.literal('assistant'),
      ts: z.string(),
      respuesta: MensajeResponseRawSchema,
    })
    .passthrough(),
]);

export type MensajeHistorialRaw = z.infer<typeof MensajeHistorialSchema>;

export const ConversacionDetalleSchema = z
  .object({
    id: z.string(),
    titulo: z.string(),
    asistente_id: z.string().optional(),
    creado_en: z.string(),
    actualizado_en: z.string().optional(),
    mensajes: z.array(MensajeHistorialSchema).default([]),
  })
  .passthrough();

export type ConversacionDetalle = z.infer<typeof ConversacionDetalleSchema>;

// ---------------------------------------------------------------------------
// Preferencias (sección 4.4)
// ---------------------------------------------------------------------------

export const PreferenciasSchema = z
  .object({
    idioma: z.enum(['es', 'en', 'pt']).default('es'),
    vista_inicial: z.enum(['chat', 'dashboard']).default('chat'),
    notificaciones: z
      .object({
        email: z.boolean().default(true),
        in_app: z.boolean().default(true),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export type Preferencias = z.infer<typeof PreferenciasSchema>;

// ---------------------------------------------------------------------------
// Acciones (sección 4.5)
// ---------------------------------------------------------------------------

export const AccionRequestSchema = z
  .object({
    id_propuesta: z.string(),
    conversation_id: z.string(),
    parametros_finales: z.record(z.unknown()),
    confirmado_en: z.string(),
  })
  .passthrough();

export type AccionRequest = z.infer<typeof AccionRequestSchema>;

// ---------------------------------------------------------------------------
// KPIs SSE (sección 4.7)
// ---------------------------------------------------------------------------

export const KpiUpdateEventSchema = z
  .object({
    kpi_id: z.string(),
    valor: z.union([z.string(), z.number()]),
    ts: z.string().optional(),
  })
  .passthrough();

export type KpiUpdateEvent = z.infer<typeof KpiUpdateEventSchema>;

// ---------------------------------------------------------------------------
// Módulo Acciones — recurso persistido (PR 8 · handoff §3.7 + Q5/Q11)
// ---------------------------------------------------------------------------

export const ESTADOS_ACCION = ['pendiente', 'ejecutada', 'rechazada', 'fallida'] as const;
export type EstadoAccion = (typeof ESTADOS_ACCION)[number];

export const TIPOS_ACCION = ['ENVIAR_CORREO', 'AGENTE_IA'] as const;
export type TipoAccion = (typeof TIPOS_ACCION)[number];

export const AuditEntrySchema = z
  .object({
    ts: z.string(),
    actor: z.string(),
    accion: z.string(),
    detalle: z.string().optional(),
  })
  .passthrough();

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const AccionSchema = z
  .object({
    id: z.string(),
    tipo: z.enum(TIPOS_ACCION),
    titulo: z.string(),
    sub: z.string().optional(),
    estado: z.enum(ESTADOS_ACCION),
    parametros: z.record(z.unknown()).default({}),
    origen: z.string().optional(),
    permiso_requerido: z.string().optional(),
    audit: z.array(AuditEntrySchema).default([]),
    creada_en: z.string(),
    ejecutada_en: z.string().optional(),
  })
  .passthrough();

export type Accion = z.infer<typeof AccionSchema>;

export const AccionesListResponseSchema = z.object({
  items: z.array(AccionSchema),
});

export type AccionesListResponse = z.infer<typeof AccionesListResponseSchema>;

// Catálogo de agentes disponibles (handoff §3.7 · tab "Agente").
// Configurado por tenant en el central; la UI lo filtra por permisos
// del usuario para mostrar habilitados / no habilitados.
export const AgenteCatalogoSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    descripcion: z.string().optional(),
    permiso_requerido: z.string(),
    estimado: z.string().optional(),
  })
  .passthrough();

export type AgenteCatalogo = z.infer<typeof AgenteCatalogoSchema>;
