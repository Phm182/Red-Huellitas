import { apiGet } from './client';
import type { MapaPunto, MapaSesion, MapaTipo } from '../types/mapa';

interface MapaResultado {
  centro: { lat: number; lng: number };
  /**
   * true = el centro NO es dónde estás: es el barrio que cargaste al
   * registrarte, porque no hubo GPS. Se muestra en pantalla para que no se
   * confunda una cosa con la otra.
   */
  centroEsZonaGuardada: boolean;
  zonaDescripcion: string | null;
  radioKm: number;
  puntos: MapaPunto[];
  total: number;
  porTipo: Record<MapaTipo, number>;
}

export const mapaApi = {
  /**
   * Qué motor usar en esta carga. Se pide una sola vez, justo antes de crear el
   * mapa: el servidor descuenta la carga del presupuesto de Mapbox y, si ya no
   * queda, responde MapLibre. Por eso el token no está en el bundle.
   */
  sesion: (tema: 'claro' | 'oscuro') =>
    apiGet<MapaSesion>('ajax/mapa/sesion.php', { tema }, true),

  /**
   * Puntos dentro del radio. `tipos` vacío trae todas las capas.
   *
   * Si no hay coordenadas (permiso denegado) **no se mandan**, en vez de
   * mandar 0,0: el backend cae a la zona guardada del usuario. Mandar ceros
   * buscaría en el Golfo de Guinea y devolvería siempre vacío.
   */
  listar: (params: { lat?: number | null; lng?: number | null; radioKm: number; tipos?: MapaTipo[] }) =>
    apiGet<MapaResultado>(
      'ajax/mapa/listar.php',
      {
        ...(params.lat != null && params.lng != null ? { lat: params.lat, lng: params.lng } : {}),
        radioKm: params.radioKm,
        ...(params.tipos && params.tipos.length > 0 ? { tipos: params.tipos.join(',') } : {}),
      },
      true
    ),
};
