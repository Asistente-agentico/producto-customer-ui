// Fixture realista de /capabilities para desarrollo y tests.
// Dominio genérico con ejemplos de salmonera (A1 del plan).

import type { Capabilities } from '@/api/types';

export const capabilitiesFixture: Capabilities = {
  version: '1.4.0',
  hash: 'cap_dev_0001',
  tenant: {
    id: 'tenant_demo',
    nombre: 'Demo Salmonera',
    expira: '2027-01-01T00:00:00Z',
  },
  usuario: {
    id_pseudo: 'u_a1b2c3d4',
    rol: 'jefe_centro',
    gerencia: 'operaciones',
    permisos: ['consultar', 'ver_kpis', 'enviar_correo', 'descargar_reportes'],
  },
  modulos: {
    central: { enabled: true, base_url: 'http://localhost:8080' },
    reportes: { enabled: true, base_url: 'http://localhost:8081', features: ['pdf', 'excel'] },
    kpis: { enabled: true, base_url: 'http://localhost:8082', features: ['streaming_sse'] },
    acciones: { enabled: true, base_url: 'http://localhost:8083' },
  },
  ui: {
    titulo: 'Asistentes Virtuales',
    subtitulo: 'Sistema integrado de gestión productiva',
    icono_sistema: 'AV',
    icono_emoji: '🐟',
    colores: {
      primario: '#eaeaea',
      sidebar: '#002c48',
      acento: '#C8102E',
    },
    etiquetas: { rol: 'Rol', usuario_id: 'Usuario' },
    botones: { enviar: 'Enviar' },
    placeholders: { consulta: 'Escribe tu consulta...' },
    mensajes: { sin_respuesta: 'Sin respuesta.' },
    flags: { autorenombrar_ambito_al_primer_mensaje: true },
    asistentes: [
      {
        id: 'engorda',
        nombre: 'Engorda',
        subtitulo: 'Centros y jaulas',
        ambitos: ['centros_cultivo', 'mortalidad_cultivo'],
        disabled: false,
      },
      {
        id: 'cosecha',
        nombre: 'Cosecha',
        subtitulo: 'Planta y logística',
        ambitos: ['cosecha', 'planta'],
        disabled: false,
      },
    ],
    consultas_sugeridas: {
      centros_cultivo: ['¿Cómo está el {entidad}?', 'Mortalidad última semana en {entidad}'],
      mortalidad_cultivo: ['¿Qué causó el aumento de mortalidad en {entidad}?'],
    },
    entidades_principales: [
      {
        nombre: 'Centro de Cultivo',
        identificador: 'centro_id',
        regex: '\\bCTR-\\d{3}\\b',
        prefijo_display: 'Centro',
      },
    ],
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-opus-4-7',
    features: ['function_calling', 'long_context'],
  },
};
