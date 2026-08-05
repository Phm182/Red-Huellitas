import { apiGet, apiPost } from './client';
import { StoryOverlay, StoryRecorte } from '../stories/storyEditorTypes';
import {
  Cadena,
  CadenaDetalle,
  Historia,
  HistoriaUsuarioResumen,
  HistoriaVistaItem,
  TipoMediaHistoria,
} from '../types';
import { appendImageFile, appendVideoFile } from '../utils/upload';

/** Todo lo opcional que puede acompañar a una historia al publicarla. */
export interface CrearHistoriaExtras {
  overlay?: StoryOverlay | null;
  /** Recorte no destructivo: el reproductor arranca y corta en este tramo. */
  recorte?: StoryRecorte | null;
  sinAudio?: boolean;
  /** 0.5 / 1 / 2. El backend rechaza cualquier otro valor. */
  velocidad?: number;
  /** Si se publica dentro de una cadena. */
  cadenaId?: number | null;
}

export const historiasApi = {
  crear: async (
    tipoMedia: TipoMediaHistoria,
    mediaUri: string,
    duracionSegundos?: number,
    mimeType?: string,
    extras?: CrearHistoriaExtras
  ) => {
    const form = new FormData();
    form.append('tipoMedia', tipoMedia);

    const overlay = extras?.overlay;
    if (overlay) {
      form.append('overlayJson', JSON.stringify(overlay));

      // Los interactivos viajan aparte del overlay: el overlay guarda dónde se
      // dibujan, y estos campos crean las filas que reciben votos y respuestas.
      if (overlay.interactivo?.kind === 'encuesta') {
        form.append('encuestaPregunta', overlay.interactivo.pregunta);
        form.append('encuestaOpcionA', overlay.interactivo.opcionA);
        form.append('encuestaOpcionB', overlay.interactivo.opcionB);
      } else if (overlay.interactivo?.kind === 'pregunta') {
        form.append('preguntaTexto', overlay.interactivo.texto);
      }
    }

    if (extras?.recorte) {
      form.append('recorteInicioSeg', String(extras.recorte.inicioSeg));
      form.append('recorteFinSeg', String(extras.recorte.finSeg));
    }
    if (extras?.sinAudio) {
      form.append('sinAudio', '1');
    }
    if (extras?.velocidad && extras.velocidad !== 1) {
      form.append('velocidad', String(extras.velocidad));
    }
    if (extras?.cadenaId) {
      form.append('cadenaId', String(extras.cadenaId));
    }

    if (tipoMedia === 'video') {
      form.append('duracionSegundos', String(duracionSegundos ?? 0));
      const ext =
        mimeType === 'video/quicktime' ? 'mov' : mimeType === 'video/webm' ? 'webm' : 'mp4';
      await appendVideoFile(form, 'media', mediaUri, `historia.${ext}`, mimeType ?? 'video/mp4');
    } else {
      await appendImageFile(form, 'media', mediaUri, 'historia.jpg');
    }
    return apiPost<{ historia: Historia }>('ajax/historias/crear.php', form, true);
  },

  feed: () => apiGet<{ usuarios: HistoriaUsuarioResumen[] }>('ajax/historias/feed.php', undefined, true),

  ver: (userId: number) => apiGet<{ historias: Historia[] }>('ajax/historias/ver.php', { userId }, true),

  marcarVista: (historiaId: number) =>
    apiPost<null>('ajax/historias/marcar_vista.php', { historiaId }, true),

  eliminar: (historiaId: number) => apiPost<null>('ajax/historias/eliminar.php', { historiaId }, true),

  /** Quién vio la historia. El backend lo rechaza con 403 si no sos el autor. */
  vistas: (historiaId: number) =>
    apiGet<{ vistas: HistoriaVistaItem[]; total: number }>(
      'ajax/historias/vistas.php',
      { historiaId },
      true
    ),

  /**
   * Reacción rápida. Tocar otra reemplaza la anterior; tocar la misma la saca.
   * El backend devuelve el estado ya resuelto, así que la UI se pinta con eso
   * y no adivina.
   */
  reaccionar: (historiaId: number, tipo: string) =>
    apiPost<{
      historiaId: number;
      miReaccion: string | null;
      conteo: Record<string, number>;
      total: number;
    }>('ajax/historias/reaccionar.php', { historiaId, tipo }, true),

  responder: (historiaId: number, texto: string) =>
    apiPost<null>('ajax/historias/responder.php', { historiaId, texto }, true),

  votarEncuesta: (encuestaId: number, opcion: 'A' | 'B') =>
    apiPost<{ votosA: number; votosB: number; miVoto: 'A' | 'B' }>(
      'ajax/historias/encuesta_votar.php',
      { encuestaId, opcion },
      true
    ),

  responderPregunta: (preguntaId: number, texto: string) =>
    apiPost<null>('ajax/historias/pregunta_responder.php', { preguntaId, texto }, true),
};

export const cadenasApi = {
  crear: (tema: string, descripcion?: string) =>
    apiPost<{ cadenaId: number; tema: string }>(
      'ajax/historias/cadena_crear.php',
      { tema, ...(descripcion ? { descripcion } : {}) },
      true
    ),

  listar: (cursor?: number | null) =>
    apiGet<{ cadenas: Cadena[]; nextCursor: number | null }>(
      'ajax/historias/cadenas_listar.php',
      { ...(cursor ? { cursor } : {}), limit: 20 },
      true
    ),

  obtener: (cadenaId: number) =>
    apiGet<CadenaDetalle>('ajax/historias/cadena_obtener.php', { cadenaId }, true),

  invitar: (cadenaId: number, userIds: number[]) =>
    apiPost<{ invitados: number }>(
      'ajax/historias/cadena_invitar.php',
      { cadenaId, userIds: userIds.join(',') },
      true
    ),
};
