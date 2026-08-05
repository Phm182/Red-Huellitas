import { apiGet, apiPost } from './client';
import type { HuePlayProgreso } from '../types/hueplay';
import { JuegoAccion, JuegoAvatarEstado, MascotaJuego, MascotaJuegoResumen } from '../types';

export const juegoApi = {
  misMascotas: () =>
    apiGet<{ mascotas: MascotaJuegoResumen[] }>('ajax/juego/mis_mascotas.php', undefined, true),

  estado: (mascotaId: number) =>
    apiGet<{ juego: MascotaJuego; progresoJuego: HuePlayProgreso }>('ajax/juego/estado.php', { mascotaId }, true),

  /** Devuelve 429 con `esperarSegundos` si la acción todavía está en cooldown. */
  accion: (mascotaId: number, tipo: JuegoAccion) =>
    apiPost<{
      juego: MascotaJuego;
      subioNivel: boolean;
      /** Nivel de la CUENTA: la XP de cuidar también suma a HuePlay. */
      progresoCuenta: HuePlayProgreso;
      /** Nivel dentro de HueGotchi. */
      progresoJuego: HuePlayProgreso;
    }>(
      'ajax/juego/accion.php',
      { mascotaId, tipo },
      true
    ),

  avatarEstado: (mascotaId: number) =>
    apiGet<{ avatar: JuegoAvatarEstado }>('ajax/juego/avatar_estado.php', { mascotaId }, true),

  /** Tarda 10-20s: el llamador tiene que mostrar un estado de espera claro. */
  avatarGenerar: (mascotaId: number) =>
    apiPost<{ juego: MascotaJuego }>('ajax/juego/avatar_generar.php', { mascotaId }, true),

  avatarQuitar: (mascotaId: number) =>
    apiPost<{ juego: MascotaJuego }>('ajax/juego/avatar_quitar.php', { mascotaId }, true),
};
