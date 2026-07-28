import type { IconName } from '../navigation/hubs';

/** Las capas que dibuja el mapa. Espeja rh_mapa_fuentes() del backend. */
export type MapaTipo =
  | 'adopcion'
  | 'transito'
  | 'perdidos'
  | 'donaciones'
  | 'productos'
  | 'veterinarias'
  | 'campanias'
  | 'refugios';

export interface MapaPunto {
  tipo: MapaTipo;
  id: number;
  titulo: string;
  subtitulo: string | null;
  zonaDescripcion: string | null;
  /**
   * Coordenada **publicable**, no la real. Para las publicaciones de personas
   * viene corrida hasta ~500 m (ver rh_geo_difuminar en el backend); sólo los
   * lugares públicos traen la exacta, y eso lo dice `ubicacionExacta`.
   */
  lat: number;
  lng: number;
  fotoPath: string | null;
  distanciaKm: number;
  ubicacionExacta: boolean;
  /** Ruta de Expo Router al detalle, ya armada por el backend. */
  ruta: string;
}

export interface MapaSesion {
  motor: 'mapbox' | 'maplibre';
  /** Sólo viene con motor 'mapbox'. Nunca está en el bundle. */
  token?: string;
  estilo?: string;
  /** Por qué se cayó a MapLibre, cuando corresponde. */
  motivo?: 'sin_token' | 'sin_cupo';
  consumo: {
    mes: number;
    limiteMes: number;
    diaUsuario: number;
    limiteDiaUsuario: number;
  };
}

/** Cómo se ve y a dónde pertenece cada capa. */
export interface MapaTipoMeta {
  tipo: MapaTipo;
  labelKey: string;
  icon: IconName;
  /** Color del pin y del chip. Se usa igual en tema claro y oscuro. */
  color: string;
}

/**
 * Paleta por capa.
 *
 * Colores fijos y no derivados del tema a propósito: en un mapa el color es lo
 * que distingue una capa de otra de un vistazo, así que tiene que significar
 * siempre lo mismo. Si cambiaran con el tema, el usuario tendría que reaprender
 * la leyenda al pasar de claro a oscuro.
 *
 * Están elegidos para separarse bien entre sí y para tener contraste suficiente
 * tanto sobre el mapa oscuro como sobre el claro.
 */
export const MAPA_TIPOS: MapaTipoMeta[] = [
  { tipo: 'adopcion', labelKey: 'adopcion.tituloLista', icon: 'home', color: '#FF4D6D' },
  { tipo: 'transito', labelKey: 'transito.tituloLista', icon: 'car', color: '#FF9F1C' },
  { tipo: 'perdidos', labelKey: 'perdidos.tituloLista', icon: 'alert-circle', color: '#FFD23F' },
  { tipo: 'donaciones', labelKey: 'donaciones.tituloLista', icon: 'gift', color: '#06D6A0' },
  { tipo: 'productos', labelKey: 'productos.tituloLista', icon: 'pricetags', color: '#4CC9F0' },
  { tipo: 'veterinarias', labelKey: 'veterinarias.tituloLista', icon: 'medkit', color: '#7B61FF' },
  { tipo: 'campanias', labelKey: 'campanias.tituloLista', icon: 'megaphone', color: '#F72585' },
  { tipo: 'refugios', labelKey: 'refugios.tituloLista', icon: 'business', color: '#00B4D8' },
];

export const MAPA_TIPO_POR_CLAVE: Record<MapaTipo, MapaTipoMeta> = MAPA_TIPOS.reduce(
  (acc, m) => ({ ...acc, [m.tipo]: m }),
  {} as Record<MapaTipo, MapaTipoMeta>
);
