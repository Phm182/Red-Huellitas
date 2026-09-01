/**
 * Catálogo de skins de HueSoccer — puramente cosmético, sin efecto en la
 * física ni en las reglas. Se elige una vez en el perfil (ver
 * `app-movil/app/(app)/ajustes/huesoccer-skins.tsx`), no por partida.
 *
 * Los nombres de pelota son inventados a propósito: nada de "Tango",
 * "Roteiro", "Mundial", "Telstar" o "Brazuca" — son modelos registrados de
 * Adidas. El estilo visual sí puede inspirarse en el look clásico de una
 * pelota de fútbol (blanco/negro con pentágonos, cuero retro, etc.), que es
 * un patrón genérico y no una marca.
 */

export type SkinFichaId = 'clasica' | 'rayada' | 'lunares' | 'bicolor' | 'estrella';
export type SkinPelotaId = 'clasica' | 'cueroRetro' | 'tricolor' | 'arcoiris' | 'lunar';

export const SKIN_FICHA_DEFAULT: SkinFichaId = 'clasica';
export const SKIN_PELOTA_DEFAULT: SkinPelotaId = 'clasica';

export const SKINS_FICHA: { id: SkinFichaId; claveI18n: string }[] = [
  { id: 'clasica', claveI18n: 'hueplay.soccer.skinsFicha.clasica' },
  { id: 'rayada', claveI18n: 'hueplay.soccer.skinsFicha.rayada' },
  { id: 'lunares', claveI18n: 'hueplay.soccer.skinsFicha.lunares' },
  { id: 'bicolor', claveI18n: 'hueplay.soccer.skinsFicha.bicolor' },
  { id: 'estrella', claveI18n: 'hueplay.soccer.skinsFicha.estrella' },
];

export const SKINS_PELOTA: { id: SkinPelotaId; claveI18n: string }[] = [
  { id: 'clasica', claveI18n: 'hueplay.soccer.skinsPelota.clasica' },
  { id: 'cueroRetro', claveI18n: 'hueplay.soccer.skinsPelota.cueroRetro' },
  { id: 'tricolor', claveI18n: 'hueplay.soccer.skinsPelota.tricolor' },
  { id: 'arcoiris', claveI18n: 'hueplay.soccer.skinsPelota.arcoiris' },
  { id: 'lunar', claveI18n: 'hueplay.soccer.skinsPelota.lunar' },
];

export function esSkinFichaValida(v: string): v is SkinFichaId {
  return SKINS_FICHA.some((s) => s.id === v);
}

export function esSkinPelotaValida(v: string): v is SkinPelotaId {
  return SKINS_PELOTA.some((s) => s.id === v);
}

/**
 * Paleta de color de ficha — antes era fijo por jugador (rosa el retador,
 * azul el retado, sin poder elegirlo). Ahora es una preferencia más, igual
 * que el patrón — 15 colores repartidos por toda la rueda cromática, no
 * unos pocos "de marca".
 */
export type ColorFichaId =
  | 'rojo'
  | 'rosa'
  | 'naranja'
  | 'amarillo'
  | 'verde'
  | 'esmeralda'
  | 'celeste'
  | 'azul'
  | 'indigo'
  | 'violeta'
  | 'magenta'
  | 'marron'
  | 'gris'
  | 'negro'
  | 'blanco';

export const COLOR_FICHA_DEFAULT: ColorFichaId = 'rojo';

export const PALETA_FICHA: { id: ColorFichaId; hex: string; claveI18n: string }[] = [
  { id: 'rojo', hex: '#E53935', claveI18n: 'hueplay.soccer.colores.rojo' },
  { id: 'rosa', hex: '#E8577E', claveI18n: 'hueplay.soccer.colores.rosa' },
  { id: 'naranja', hex: '#F0A830', claveI18n: 'hueplay.soccer.colores.naranja' },
  { id: 'amarillo', hex: '#FBC02D', claveI18n: 'hueplay.soccer.colores.amarillo' },
  { id: 'verde', hex: '#43A047', claveI18n: 'hueplay.soccer.colores.verde' },
  { id: 'esmeralda', hex: '#26A69A', claveI18n: 'hueplay.soccer.colores.esmeralda' },
  { id: 'celeste', hex: '#29B6F6', claveI18n: 'hueplay.soccer.colores.celeste' },
  { id: 'azul', hex: '#5B9AD6', claveI18n: 'hueplay.soccer.colores.azul' },
  { id: 'indigo', hex: '#5C6BC0', claveI18n: 'hueplay.soccer.colores.indigo' },
  { id: 'violeta', hex: '#B36FE0', claveI18n: 'hueplay.soccer.colores.violeta' },
  { id: 'magenta', hex: '#EC407A', claveI18n: 'hueplay.soccer.colores.magenta' },
  { id: 'marron', hex: '#6B4226', claveI18n: 'hueplay.soccer.colores.marron' },
  { id: 'gris', hex: '#78909C', claveI18n: 'hueplay.soccer.colores.gris' },
  { id: 'negro', hex: '#2B2B2B', claveI18n: 'hueplay.soccer.colores.negro' },
  { id: 'blanco', hex: '#F5F5F5', claveI18n: 'hueplay.soccer.colores.blanco' },
];

export function esColorFichaValido(v: string): v is ColorFichaId {
  return PALETA_FICHA.some((c) => c.id === v);
}

export function hexDeColorFicha(id: string): string {
  return PALETA_FICHA.find((c) => c.id === id)?.hex ?? PALETA_FICHA.find((c) => c.id === COLOR_FICHA_DEFAULT)!.hex;
}

function hexANumeros(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function numerosAHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbAHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslARgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Color "opuesto" en el círculo cromático (matiz +180°) — es lo que ve el
 * jugador en el rival cuando los dos eligieron el MISMO color, así nunca se
 * confunden las fichas de los dos lados. No hace falta negociar nada por
 * red: cada cliente lo calcula solo a partir de los dos colores elegidos,
 * mismo criterio que ya usa el resto de HueSoccer (turnos, física del
 * tiro).
 */
export function colorComplementario(hex: string): string {
  const [h, s, l] = rgbAHsl(...hexANumeros(hex));
  const [r, g, b] = hslARgb((h + 180) % 360, s, l);
  return numerosAHex(r, g, b);
}

/** Blanco o negro, el que más contraste tenga contra `hexBase` — para el patrón del disco interno de la ficha. */
export function colorContrastante(hexBase: string): string {
  const [r, g, b] = hexANumeros(hexBase);
  // Luminancia relativa aproximada (suficiente para elegir claro/oscuro, no hace falta el gamma exacto de WCAG).
  const luminancia = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminancia > 0.6 ? '#1A1A1A' : '#FFFFFF';
}

/**
 * Colores finales de los dos lados de un partido. Si eligieron colores
 * distintos, cada uno ve el suyo tal cual lo configuró. Si eligieron el
 * MISMO color, el mío se muestra siempre real — el del rival se muestra
 * complementario, así los dos lados quedan distinguibles sin que nadie
 * "pierda" su propio color elegido (desde la pantalla del rival pasa lo
 * mismo al revés: él ve el suyo real y el mío complementario).
 */
export function resolverColorFicha(
  miColorId: string,
  susColorId: string
): { mio: string; suyo: string } {
  const mioHex = hexDeColorFicha(miColorId);
  const susHexBase = hexDeColorFicha(susColorId);
  const suyo = miColorId === susColorId ? colorComplementario(susHexBase) : susHexBase;
  return { mio: mioHex, suyo };
}

/**
 * Sólo hay una pelota en pantalla — no puede mostrar dos skins a la vez.
 * Se usa siempre el skin de pelota del retador (determinístico, ambos
 * clientes lo calculan igual vía `desafio.soyRetador`).
 */
export function skinPelotaDelPartido(skinRetador: SkinPelotaId): SkinPelotaId {
  return skinRetador;
}
