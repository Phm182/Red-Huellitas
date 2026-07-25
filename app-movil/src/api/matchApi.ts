import { apiGet, apiPost } from './client';
import { Especie, MascotaMatch, MatchCandidato, MatchDireccion, MatchMensaje, Sexo } from '../types';

export interface CandidatosParams {
  mascotaIdOrigen: number;
  especie?: Especie | null;
  sexo?: Sexo | null;
  razaId?: number | null;
  edadMin?: number | null;
  edadMax?: number | null;
  radioKm?: 20 | 50 | 100 | null;
}

export const matchApi = {
  candidatos: (params: CandidatosParams) =>
    apiGet<{ candidatos: MatchCandidato[] }>(
      'ajax/match/candidatos.php',
      {
        mascotaIdOrigen: params.mascotaIdOrigen,
        ...(params.especie ? { especie: params.especie } : {}),
        ...(params.sexo ? { sexo: params.sexo } : {}),
        ...(params.razaId ? { razaId: params.razaId } : {}),
        ...(params.edadMin ? { edadMin: params.edadMin } : {}),
        ...(params.edadMax ? { edadMax: params.edadMax } : {}),
        ...(params.radioKm ? { radioKm: params.radioKm } : {}),
      },
      true
    ),

  swipe: (mascotaIdOrigen: number, mascotaIdDestino: number, direccion: MatchDireccion) =>
    apiPost<{ match: boolean; matchId?: number; mascotaCandidata?: MatchCandidato }>(
      'ajax/match/swipe.php',
      { mascotaIdOrigen, mascotaIdDestino, direccion },
      true
    ),

  misMatches: () => apiGet<{ matches: MascotaMatch[] }>('ajax/match/mis_matches.php', undefined, true),

  mensajes: (matchId: number, cursor?: number | null) =>
    apiGet<{ mensajes: MatchMensaje[]; nextCursor: number | null }>(
      'ajax/match/conversacion_mensajes.php',
      { matchId, ...(cursor ? { cursor } : {}) },
      true
    ),

  enviarMensaje: (matchId: number, texto: string) =>
    apiPost<{ mensaje: MatchMensaje }>('ajax/match/mensaje_enviar.php', { matchId, texto }, true),

  revelarWhatsapp: (matchId: number) =>
    apiPost<{ revelado: boolean; whatsappNumero?: string | null; nombreCompleto?: string | null }>(
      'ajax/match/whatsapp_revelar.php',
      { matchId },
      true
    ),

  deshacer: (matchId: number) => apiPost<null>('ajax/match/deshacer.php', { matchId }, true),
};
