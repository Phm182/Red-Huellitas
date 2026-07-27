import { apiGet, apiPost } from './client';
import { SuscripcionEstado, SuscripcionPlan } from '../types';

export const suscripcionApi = {
  estado: () => apiGet<{ suscripcion: SuscripcionEstado }>('ajax/suscripcion/estado.php', undefined, true),

  planes: () => apiGet<{ planes: SuscripcionPlan[] }>('ajax/suscripcion/planes.php', undefined, true),

  solicitarManual: (planId?: number) =>
    apiPost<{ solicitudId: number; whatsappUrl: string | null }>(
      'ajax/suscripcion/manual_solicitar.php',
      { ...(planId ? { planId } : {}) },
      true
    ),

  crearPreapprovalMp: (planId?: number) =>
    apiPost<{ initPoint: string | null; mpEstado: string | null }>(
      'ajax/suscripcion/mp_preapproval_crear.php',
      { ...(planId ? { planId } : {}) },
      true
    ),

  resyncMp: () => apiPost<{ suscripcion: SuscripcionEstado }>('ajax/suscripcion/mp_resync.php', {}, true),
};
