import type { AuthMe } from '@/api/types';

export const authMeFixture: AuthMe = {
  id_pseudo: 'u_a1b2c3d4',
  rol: 'lider_linea',
  gerencia: 'operaciones',
  permisos: ['consultar', 'ver_kpis', 'enviar_correo', 'descargar_reportes'],
};
