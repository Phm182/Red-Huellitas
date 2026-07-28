import { apiGet, apiPost } from './client';
import {
  CampaniaPanel,
  CampaniaPregunta,
  EstadoInscripcion,
  RespuestaCampania,
  TipoPreguntaCampania,
  Campania,
  CampaniaInscripcionPropia,
  CampaniaInscripto,
  TipoCampania,
} from '../types';

interface CampaniaListaResultado {
  campanias: Campania[];
  nextCursor: number | null;
}

export interface CrearCampaniaParams {
  tipo: TipoCampania;
  titulo: string;
  descripcion?: string;
  fechaDesde: string;
  fechaHasta?: string | null;
  zonaDescripcion: string;
  /** Calle y numero; opcional (una plaza puede no tenerla). */
  direccion?: string;
  zonaLat: number;
  zonaLng: number;
  requiereInscripcion: boolean;
  cupoMaximo?: number | null;
}

export const campaniaApi = {
  crear: (params: CrearCampaniaParams) =>
    apiPost<{ campania: Campania }>(
      'ajax/campanias/crear.php',
      {
        tipo: params.tipo,
        titulo: params.titulo,
        descripcion: params.descripcion ?? '',
        fechaDesde: params.fechaDesde,
        ...(params.fechaHasta ? { fechaHasta: params.fechaHasta } : {}),
        zonaDescripcion: params.zonaDescripcion,
        ...(params.direccion ? { direccion: params.direccion } : {}),
        zonaLat: params.zonaLat,
        zonaLng: params.zonaLng,
        requiereInscripcion: params.requiereInscripcion ? '1' : '0',
        ...(params.requiereInscripcion && params.cupoMaximo ? { cupoMaximo: params.cupoMaximo } : {}),
      },
      true
    ),

  listar: (tipo?: TipoCampania, cursor?: number | null, limit = 15) =>
    apiGet<CampaniaListaResultado>(
      'ajax/campanias/listar.php',
      { ...(tipo ? { tipo } : {}), ...(cursor ? { cursor } : {}), limit },
      true
    ),

  obtener: (campaniaId: number) =>
    apiGet<{ campania: Campania }>('ajax/campanias/obtener.php', { campaniaId }, true),

  eliminar: (campaniaId: number) => apiPost<null>('ajax/campanias/eliminar.php', { campaniaId }, true),

  /**
   * Inscribirse. Si el cupo está lleno el backend NO rechaza: devuelve
   * `enListaEspera: true` y la posición. La pantalla tiene que decirlo, no
   * tratarlo como un error.
   */
  inscribirme: (campaniaId: number, respuestas: RespuestaCampania[] = []) =>
    apiPost<{
      campaniaInscripcionId: number;
      estado: EstadoInscripcion;
      posicion: number;
      enListaEspera: boolean;
      mensajeAviso: string | null;
    }>(
      'ajax/campanias/inscribirme.php',
      {
        campaniaId,
        ...(respuestas.length > 0 ? { respuestas: JSON.stringify(respuestas) } : {}),
      },
      true
    ),

  /** Baja propia, o del organizador sobre alguien. Asciende al que espera. */
  darDeBaja: (campaniaInscripcionId: number) =>
    apiPost<{ ascendidoUserId: number | null }>(
      'ajax/campanias/baja.php',
      { campaniaInscripcionId },
      true
    ),

  /** Para cuando ya venció el plazo de baja pero igual no se va a asistir. */
  avisarAusencia: (campaniaInscripcionId: number, nota?: string) =>
    apiPost<{ ascendidoUserId: number | null }>(
      'ajax/campanias/aviso_ausencia.php',
      { campaniaInscripcionId, ...(nota ? { nota } : {}) },
      true
    ),

  /** Panel del organizador: resumen, lista ordenada y respuestas, en un pedido. */
  panel: (campaniaId: number) =>
    apiGet<CampaniaPanel>('ajax/campanias/administrar.php', { campaniaId }, true),

  /** Configurar cupo, plazo de baja, aviso y el formulario. */
  guardarFormulario: (
    campaniaId: number,
    cfg: {
      requiereInscripcion: boolean;
      cupoMaximo?: number | null;
      bajaLimiteHoras?: number | null;
      mensajeAviso?: string | null;
      preguntas?: { tipo: TipoPreguntaCampania; texto: string; obligatoria: boolean; opciones?: string[] }[];
    }
  ) =>
    apiPost<{ preguntas: CampaniaPregunta[] }>(
      'ajax/campanias/formulario_guardar.php',
      {
        campaniaId,
        requiereInscripcion: cfg.requiereInscripcion ? '1' : '0',
        // Vacío = ilimitado / sin plazo. Mandar '0' significaría otra cosa.
        cupoMaximo: cfg.cupoMaximo != null ? String(cfg.cupoMaximo) : '',
        bajaLimiteHoras: cfg.bajaLimiteHoras != null ? String(cfg.bajaLimiteHoras) : '',
        mensajeAviso: cfg.mensajeAviso ?? '',
        ...(cfg.preguntas ? { preguntas: JSON.stringify(cfg.preguntas) } : {}),
      },
      true
    ),

  misInscripciones: () =>
    apiGet<{ inscripciones: CampaniaInscripcionPropia[] }>('ajax/campanias/mis_inscripciones.php', undefined, true),

  inscripcionesRecibidas: (campaniaId: number) =>
    apiGet<{ inscriptos: CampaniaInscripto[] }>(
      'ajax/campanias/inscripciones_recibidas.php',
      { campaniaId },
      true
    ),
};
