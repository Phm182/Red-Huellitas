/**
 * Tipos y helpers del editor de historias (estilo Instagram).
 */

export type StoryFilterId =
  | 'none'
  | 'clarendon'
  | 'gingham'
  | 'moon'
  | 'lark'
  | 'reyes'
  | 'juno'
  | 'slumber'
  | 'crema'
  | 'ludwig'
  | 'aden'
  | 'perpetua'
  | 'amaro'
  | 'mayfair'
  | 'rise'
  | 'hudson'
  | 'valencia'
  | 'xpro'
  | 'sierra'
  | 'willow'
  | 'lofi'
  | 'inkwell'
  | 'nashville';

export type StoryFontId = 'classic' | 'modern' | 'strong' | 'script' | 'mono' | 'serif';

export type StoryTextItem = {
  id: string;
  text: string;
  /** 0–1 relativo al canvas */
  x: number;
  y: number;
  color: string;
  scale: number;
  /** grados */
  rotation: number;
  fontId: StoryFontId;
};

export type StoryPathItem = {
  id: string;
  color: string;
  width: number;
  /** puntos normalizados 0–1 */
  points: { x: number; y: number }[];
};

/** Emoji o sticker colocado sobre la historia. */
export type StoryStickerItem = {
  id: string;
  emoji: string;
  /** 0–1 relativo al canvas */
  x: number;
  y: number;
  scale: number;
  /** grados */
  rotation: number;
};

/**
 * Sticker interactivo (encuesta o caja de preguntas).
 *
 * Sólo se guarda acá la POSICIÓN y el texto para poder dibujarlo; los votos y
 * las respuestas viven en sus propias tablas (`HistoriaEncuesta`,
 * `HistoriaPregunta`), porque necesitan integridad y consultas propias.
 * Se permite uno solo por historia: dos encuestas encimadas no se leen.
 */
export type StoryInteractivo =
  | { kind: 'encuesta'; x: number; y: number; pregunta: string; opcionA: string; opcionB: string }
  | { kind: 'pregunta'; x: number; y: number; texto: string };

export type StoryOverlay = {
  filter: StoryFilterId;
  texts: StoryTextItem[];
  paths: StoryPathItem[];
  /**
   * Opcionales: las historias publicadas antes de que existieran tienen el
   * overlay sin estos campos, así que todo lector tiene que tolerar undefined.
   */
  stickers?: StoryStickerItem[];
  interactivo?: StoryInteractivo | null;
};

/**
 * Recorte no destructivo del video.
 *
 * No se re-encodea nada: se guarda el tramo y el reproductor arranca y corta
 * ahí. Recortar de verdad exige build nativo (ffmpeg-kit fue retirado), y
 * para algo que vence a las 24hs no vale la pena.
 */
export type StoryRecorte = {
  inicioSeg: number;
  finSeg: number;
};

export type StoryFilterDef = {
  id: StoryFilterId;
  label: string;
  /** Capas de color (aproximación nativa) */
  layers: { color: string }[];
  /** CSS filter para web (más fiel a apps pro) */
  cssFilter?: string;
};

/** Filtros inspirados en looks Instagram / apps creativas actuales. */
export const STORY_FILTERS: StoryFilterDef[] = [
  { id: 'none', label: 'Original', layers: [] },
  {
    id: 'clarendon',
    label: 'Clarendon',
    layers: [{ color: 'rgba(127,187,227,0.18)' }, { color: 'rgba(255,255,255,0.08)' }],
    cssFilter: 'contrast(1.2) saturate(1.35) brightness(1.05)',
  },
  {
    id: 'gingham',
    label: 'Gingham',
    layers: [{ color: 'rgba(230, 200, 220, 0.22)' }],
    cssFilter: 'brightness(1.05) hue-rotate(-10deg) sepia(0.08)',
  },
  {
    id: 'moon',
    label: 'Moon',
    layers: [{ color: 'rgba(60,70,90,0.35)' }, { color: 'rgba(255,255,255,0.06)' }],
    cssFilter: 'grayscale(1) contrast(1.1) brightness(1.1)',
  },
  {
    id: 'lark',
    label: 'Lark',
    layers: [{ color: 'rgba(34, 139, 34, 0.1)' }, { color: 'rgba(255,255,200,0.12)' }],
    cssFilter: 'contrast(0.9) brightness(1.1) saturate(1.2)',
  },
  {
    id: 'reyes',
    label: 'Reyes',
    layers: [{ color: 'rgba(239, 205, 173, 0.28)' }],
    cssFilter: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)',
  },
  {
    id: 'juno',
    label: 'Juno',
    layers: [{ color: 'rgba(255, 120, 90, 0.18)' }, { color: 'rgba(100, 60, 180, 0.08)' }],
    cssFilter: 'contrast(1.15) saturate(1.4) brightness(1.05) hue-rotate(-5deg)',
  },
  {
    id: 'slumber',
    label: 'Slumber',
    layers: [{ color: 'rgba(180, 140, 160, 0.28)' }],
    cssFilter: 'saturate(0.66) brightness(1.05) sepia(0.15)',
  },
  {
    id: 'crema',
    label: 'Crema',
    layers: [{ color: 'rgba(255, 230, 200, 0.25)' }],
    cssFilter: 'sepia(0.3) contrast(0.9) brightness(1.08) saturate(0.9)',
  },
  {
    id: 'ludwig',
    label: 'Ludwig',
    layers: [{ color: 'rgba(255, 200, 160, 0.15)' }, { color: 'rgba(0,0,0,0.08)' }],
    cssFilter: 'contrast(1.05) saturate(0.85) brightness(1.05)',
  },
  {
    id: 'aden',
    label: 'Aden',
    layers: [{ color: 'rgba(120, 160, 200, 0.2)' }, { color: 'rgba(255, 180, 140, 0.1)' }],
    cssFilter: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.15)',
  },
  {
    id: 'perpetua',
    label: 'Perpetua',
    layers: [{ color: 'rgba(0, 180, 140, 0.12)' }, { color: 'rgba(255, 255, 200, 0.1)' }],
    cssFilter: 'contrast(1.1) brightness(1.1) saturate(1.1)',
  },
  {
    id: 'amaro',
    label: 'Amaro',
    layers: [{ color: 'rgba(255, 200, 100, 0.18)' }, { color: 'rgba(80, 40, 120, 0.08)' }],
    cssFilter: 'brightness(1.1) contrast(0.9) saturate(1.5) hue-rotate(-10deg)',
  },
  {
    id: 'mayfair',
    label: 'Mayfair',
    layers: [{ color: 'rgba(255, 180, 200, 0.18)' }, { color: 'rgba(255,255,255,0.06)' }],
    cssFilter: 'contrast(1.1) saturate(1.1) brightness(1.08)',
  },
  {
    id: 'rise',
    label: 'Rise',
    layers: [{ color: 'rgba(255, 220, 160, 0.22)' }],
    cssFilter: 'brightness(1.15) sepia(0.2) contrast(0.9) saturate(0.9)',
  },
  {
    id: 'hudson',
    label: 'Hudson',
    layers: [{ color: 'rgba(40, 100, 160, 0.22)' }, { color: 'rgba(255, 160, 80, 0.08)' }],
    cssFilter: 'brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(-15deg)',
  },
  {
    id: 'valencia',
    label: 'Valencia',
    layers: [{ color: 'rgba(255, 160, 80, 0.2)' }, { color: 'rgba(80, 40, 20, 0.08)' }],
    cssFilter: 'contrast(1.08) brightness(1.08) sepia(0.15) saturate(1.2)',
  },
  {
    id: 'xpro',
    label: 'X-Pro',
    layers: [{ color: 'rgba(0, 80, 60, 0.25)' }, { color: 'rgba(255, 200, 100, 0.1)' }],
    cssFilter: 'contrast(1.3) saturate(1.3) sepia(0.2) hue-rotate(-15deg)',
  },
  {
    id: 'sierra',
    label: 'Sierra',
    layers: [{ color: 'rgba(200, 160, 140, 0.22)' }],
    cssFilter: 'contrast(0.9) sepia(0.15) brightness(1.1) saturate(0.85)',
  },
  {
    id: 'willow',
    label: 'Willow',
    layers: [{ color: 'rgba(100, 100, 110, 0.35)' }],
    cssFilter: 'grayscale(0.5) contrast(0.95) brightness(1.1)',
  },
  {
    id: 'lofi',
    label: 'Lo-Fi',
    layers: [{ color: 'rgba(255, 100, 50, 0.12)' }, { color: 'rgba(0,0,0,0.12)' }],
    cssFilter: 'contrast(1.4) saturate(1.1) brightness(0.95)',
  },
  {
    id: 'inkwell',
    label: 'Inkwell',
    layers: [{ color: 'rgba(0,0,0,0.2)' }],
    cssFilter: 'grayscale(1) contrast(1.15) brightness(1.05)',
  },
  {
    id: 'nashville',
    label: 'Nashville',
    layers: [{ color: 'rgba(255, 180, 140, 0.25)' }, { color: 'rgba(160, 80, 120, 0.1)' }],
    cssFilter: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)',
  },
];

export const STORY_FONTS: { id: StoryFontId; label: string; fontFamily: string }[] = [
  { id: 'classic', label: 'Clásica', fontFamily: 'Nunito_700Bold' },
  { id: 'modern', label: 'Modern', fontFamily: 'Outfit_700Bold' },
  { id: 'strong', label: 'Impacto', fontFamily: 'BebasNeue_400Regular' },
  { id: 'script', label: 'Script', fontFamily: 'Pacifico_400Regular' },
  { id: 'mono', label: 'Mono', fontFamily: 'SpaceMono_700Bold' },
  { id: 'serif', label: 'Serif', fontFamily: 'PlayfairDisplay_700Bold' },
];

export const STORY_TEXT_COLORS = ['#FFFFFF', '#FFE566', '#FF5C6A', '#2DD4BF', '#A78BFA', '#111111'];
export const STORY_DRAW_COLORS = ['#FFFFFF', '#FFE566', '#FF5C6A', '#2DD4BF', '#A78BFA', '#111111'];

/** Emoji sugeridos, arrancando por los que tienen que ver con mascotas. */
export const STORY_STICKERS = [
  '🐶', '🐱', '🐾', '🦴', '🎾', '🐕', '🐈', '🦮', '🐩', '🐰',
  '❤️', '😍', '🥹', '😂', '🤩', '✨', '🔥', '⭐', '🎉', '💦',
  '☀️', '🌊', '🏖️', '🌳', '🦋', '🌈', '💧', '🍖', '🥎', '🏆',
];

export function emptyOverlay(): StoryOverlay {
  return { filter: 'none', texts: [], paths: [], stickers: [], interactivo: null };
}

export function overlayHasContent(o: StoryOverlay): boolean {
  return (
    o.filter !== 'none' ||
    o.texts.length > 0 ||
    o.paths.length > 0 ||
    (o.stickers?.length ?? 0) > 0 ||
    !!o.interactivo
  );
}

export function storyFontFamily(fontId?: StoryFontId): string {
  return STORY_FONTS.find((f) => f.id === fontId)?.fontFamily ?? STORY_FONTS[0].fontFamily;
}
