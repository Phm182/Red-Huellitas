import { HueSpecies, PetAgeStage } from './types';

/**
 * Morfología real por raza.
 *
 * `RazaCatalogo` sólo guarda el nombre, así que las proporciones viven acá:
 * una tabla con las 37 razas del catálogo. Un Salchicha tiene que verse largo y
 * bajo, un Pug chato y compacto, un Siamés flaco con orejas enormes. Un hash de
 * color no alcanza para eso.
 *
 * Todos los multiplicadores son relativos a 1 = animal promedio de su especie.
 */

export type EarStyle = 'erecta_punta' | 'erecta_redonda' | 'caida' | 'semi' | 'triangulo';

export type CoatPattern =
  | 'solido'
  | 'manchado'
  | 'rayado'
  | 'bicolor'
  | 'colorpoint'
  | 'mascara'
  | 'tricolor';

export type BreedProfile = {
  nombre: string;
  species: HueSpecies;
  /** Peso adulto típico en kg: define la escala general y el tamaño de la sombra. */
  weightKg: number;
  /** Ancho del tronco (robustez). */
  bodyWidth: number;
  /** Alto del tronco. */
  bodyHeight: number;
  /** Largo del lomo: >1 estira el cuerpo hacia atrás (Salchicha, Basset). */
  bodyLength: number;
  /** Alto de patas: <1 pegado al piso, >1 zancudo. */
  legLength: number;
  headSize: number;
  /** 0 = braquicéfalo (Pug, Persa) … 1 = hocico largo (Pastor, Collie). */
  snoutLength: number;
  earSize: number;
  earStyle: EarStyle;
  /** 0 = sin cola (Bulldog Francés) … 1.4 = cola larga. */
  tailLength: number;
  /** 0 = pelada … 1 = plumero (Husky, Golden). */
  tailFluff: number;
  /** 0 = pelo raso / Sphynx … 1 = pelo largo (Persa, Shih Tzu). */
  fluff: number;
  base: string;
  accent: string;
  belly: string;
  eye: string;
  nose: string;
  pattern: CoatPattern;
};

type Morph = Omit<BreedProfile, 'nombre' | 'species'>;

const PERRO_PROMEDIO: Morph = {
  weightKg: 18,
  bodyWidth: 1,
  bodyHeight: 1,
  bodyLength: 1,
  legLength: 1,
  headSize: 1,
  snoutLength: 0.7,
  earSize: 1,
  earStyle: 'caida',
  tailLength: 1,
  tailFluff: 0.4,
  fluff: 0.3,
  base: '#C99B6A',
  accent: '#8A6440',
  belly: '#F2E4CE',
  eye: '#5B3A1E',
  nose: '#2B2B2B',
  pattern: 'bicolor',
};

const GATO_PROMEDIO: Morph = {
  weightKg: 4.5,
  bodyWidth: 0.92,
  bodyHeight: 0.95,
  bodyLength: 1.02,
  legLength: 0.9,
  headSize: 0.95,
  snoutLength: 0.28,
  earSize: 1.15,
  earStyle: 'triangulo',
  tailLength: 1.25,
  tailFluff: 0.45,
  fluff: 0.35,
  base: '#A8865C',
  accent: '#6B5236',
  belly: '#E2D0B2',
  eye: '#B8A44E',
  nose: '#E8899A',
  pattern: 'rayado',
};

/** Clave = nombre del catálogo pasado por `slugRaza()`. */
const RAZAS: Record<string, Partial<Morph> & { species: HueSpecies }> = {
  // ---------------------------------------------------------------- perros
  labrador_retriever: {
    species: 'perro',
    weightKg: 32, bodyWidth: 1.12, bodyLength: 1.05, legLength: 1.02,
    snoutLength: 0.7, earSize: 1.05, earStyle: 'caida', tailLength: 1.05,
    tailFluff: 0.3, fluff: 0.2,
    base: '#E5C489', accent: '#C9A467', belly: '#F7EBD2', pattern: 'solido',
  },
  golden_retriever: {
    species: 'perro',
    weightKg: 32, bodyWidth: 1.08, bodyLength: 1.08, legLength: 1.05,
    snoutLength: 0.75, earSize: 1.1, earStyle: 'caida', tailLength: 1.2,
    tailFluff: 0.95, fluff: 0.78,
    base: '#E3A857', accent: '#C98B3C', belly: '#F6DFAE', pattern: 'solido',
  },
  beagle: {
    species: 'perro',
    weightKg: 11, bodyWidth: 1.02, bodyLength: 1.06, legLength: 0.78,
    snoutLength: 0.58, earSize: 1.28, earStyle: 'caida', tailLength: 0.9,
    tailFluff: 0.35, fluff: 0.15,
    base: '#D9A05B', accent: '#3A2A22', belly: '#F7F1E6', pattern: 'tricolor',
  },
  border_collie: {
    species: 'perro',
    weightKg: 18, bodyWidth: 0.92, bodyLength: 1.1, legLength: 1.05,
    snoutLength: 0.85, earSize: 1, earStyle: 'semi', tailLength: 1.25,
    tailFluff: 0.9, fluff: 0.62,
    base: '#2E2A28', accent: '#F7F4EF', belly: '#F7F4EF', pattern: 'bicolor',
  },
  boxer: {
    species: 'perro',
    weightKg: 30, bodyWidth: 1.15, bodyLength: 1, legLength: 1.08,
    snoutLength: 0.22, earSize: 0.95, earStyle: 'caida', tailLength: 0.4,
    tailFluff: 0.2, fluff: 0.05,
    base: '#C97B3C', accent: '#3A2A22', belly: '#F0E2CE', pattern: 'mascara',
  },
  bulldog_frances: {
    species: 'perro',
    weightKg: 11, bodyWidth: 1.26, bodyHeight: 0.95, bodyLength: 0.86,
    legLength: 0.58, headSize: 1.08, snoutLength: 0.05, earSize: 1.5,
    earStyle: 'erecta_redonda', tailLength: 0.08, tailFluff: 0.1, fluff: 0.05,
    base: '#8C8378', accent: '#4A443D', belly: '#EFE7DA', pattern: 'manchado',
  },
  bulldog_ingles: {
    species: 'perro',
    weightKg: 24, bodyWidth: 1.38, bodyHeight: 0.92, bodyLength: 0.9,
    legLength: 0.48, headSize: 1.12, snoutLength: 0.03, earSize: 0.8,
    earStyle: 'caida', tailLength: 0.12, tailFluff: 0.1, fluff: 0.05,
    base: '#E0C4A0', accent: '#B07C4E', belly: '#F6EEE2', pattern: 'manchado',
  },
  caniche: {
    species: 'perro',
    weightKg: 7, bodyWidth: 0.86, bodyLength: 0.95, legLength: 1.12,
    snoutLength: 0.72, earSize: 1.05, earStyle: 'caida', tailLength: 0.7,
    tailFluff: 1, fluff: 1,
    base: '#F0E6D8', accent: '#D8C6AE', belly: '#FAF5EE', pattern: 'solido',
  },
  chihuahua: {
    species: 'perro',
    weightKg: 2.5, bodyWidth: 0.86, bodyLength: 0.85, legLength: 0.82,
    headSize: 1.15, snoutLength: 0.3, earSize: 1.65, earStyle: 'erecta_punta',
    tailLength: 0.85, tailFluff: 0.3, fluff: 0.15,
    base: '#D9A15C', accent: '#F2E3CC', belly: '#F7ECD9', pattern: 'bicolor',
  },
  cocker_spaniel: {
    species: 'perro',
    weightKg: 13, bodyWidth: 1, bodyLength: 1, legLength: 0.8,
    snoutLength: 0.6, earSize: 1.55, earStyle: 'caida', tailLength: 0.6,
    tailFluff: 0.75, fluff: 0.72,
    base: '#B5651D', accent: '#8A4A12', belly: '#EFD9B8', pattern: 'solido',
  },
  dalmata: {
    species: 'perro',
    weightKg: 27, bodyWidth: 0.95, bodyLength: 1.08, legLength: 1.18,
    snoutLength: 0.8, earSize: 1.05, earStyle: 'caida', tailLength: 1.1,
    tailFluff: 0.15, fluff: 0.05,
    base: '#F7F4EF', accent: '#2A2725', belly: '#FFFFFF', pattern: 'manchado',
  },
  dogo_argentino: {
    species: 'perro',
    weightKg: 42, bodyWidth: 1.22, bodyLength: 1.05, legLength: 1.15,
    snoutLength: 0.6, earSize: 0.9, earStyle: 'caida', tailLength: 1,
    tailFluff: 0.15, fluff: 0.05,
    base: '#F5F2EC', accent: '#E2DAD0', belly: '#FFFFFF', pattern: 'solido',
  },
  husky_siberiano: {
    species: 'perro',
    weightKg: 23, bodyWidth: 1, bodyLength: 1.05, legLength: 1.05,
    snoutLength: 0.72, earSize: 1.18, earStyle: 'erecta_punta', tailLength: 1.15,
    tailFluff: 1, fluff: 0.92,
    base: '#6E6A66', accent: '#F5F2EC', belly: '#F7F4EF', eye: '#5AA8D6',
    pattern: 'mascara',
  },
  pastor_aleman: {
    species: 'perro',
    weightKg: 34, bodyWidth: 1.05, bodyLength: 1.12, legLength: 1.1,
    snoutLength: 0.92, earSize: 1.32, earStyle: 'erecta_punta', tailLength: 1.28,
    tailFluff: 0.8, fluff: 0.6,
    base: '#B5813F', accent: '#2B241F', belly: '#D8B98A', pattern: 'mascara',
  },
  pug: {
    species: 'perro',
    weightKg: 8, bodyWidth: 1.3, bodyHeight: 0.95, bodyLength: 0.82,
    legLength: 0.58, headSize: 1.12, snoutLength: 0.02, earSize: 0.85,
    earStyle: 'caida', tailLength: 0.22, tailFluff: 0.15, fluff: 0.1,
    base: '#E3C79A', accent: '#2B2320', belly: '#F4E7CE', pattern: 'mascara',
  },
  rottweiler: {
    species: 'perro',
    weightKg: 50, bodyWidth: 1.28, bodyLength: 1, legLength: 1,
    snoutLength: 0.5, earSize: 0.95, earStyle: 'caida', tailLength: 0.3,
    tailFluff: 0.2, fluff: 0.1,
    base: '#241F1C', accent: '#9C5A2A', belly: '#3A2E26', pattern: 'tricolor',
  },
  salchicha_dachshund: {
    species: 'perro',
    weightKg: 9, bodyWidth: 0.95, bodyHeight: 0.9, bodyLength: 1.62,
    legLength: 0.36, snoutLength: 0.88, earSize: 1.32, earStyle: 'caida',
    tailLength: 0.95, tailFluff: 0.3, fluff: 0.15,
    base: '#2B2320', accent: '#B5773F', belly: '#B5773F', pattern: 'tricolor',
  },
  shih_tzu: {
    species: 'perro',
    weightKg: 6, bodyWidth: 1.06, bodyLength: 0.9, legLength: 0.54,
    headSize: 1.05, snoutLength: 0.08, earSize: 1.18, earStyle: 'caida',
    tailLength: 0.8, tailFluff: 1, fluff: 1,
    base: '#E8DCC6', accent: '#8A7256', belly: '#F7F1E4', pattern: 'bicolor',
  },
  yorkshire_terrier: {
    species: 'perro',
    weightKg: 3, bodyWidth: 0.82, bodyLength: 0.88, legLength: 0.76,
    headSize: 1.06, snoutLength: 0.5, earSize: 1.05, earStyle: 'erecta_punta',
    tailLength: 0.6, tailFluff: 0.7, fluff: 0.95,
    base: '#4A4A55', accent: '#C08A4B', belly: '#D9A25E', pattern: 'tricolor',
  },
  mestizo: { species: 'perro' },
  sin_raza_perro: { species: 'perro' },

  // ----------------------------------------------------------------- gatos
  angora: {
    species: 'gato',
    weightKg: 4, fluff: 0.95, tailFluff: 1, tailLength: 1.3,
    base: '#F7F3EA', accent: '#E6DDCE', belly: '#FFFFFF', eye: '#7FB77E',
    pattern: 'solido',
  },
  atigrado_gris: {
    species: 'gato',
    weightKg: 4.5,
    base: '#8A8C8E', accent: '#4E5052', belly: '#D9DBDC', pattern: 'rayado',
  },
  atigrado_marron: {
    species: 'gato',
    weightKg: 4.5,
    base: '#A57A4A', accent: '#5A3E24', belly: '#E0C9A6', pattern: 'rayado',
  },
  azul_ruso: {
    species: 'gato',
    weightKg: 4, bodyWidth: 0.85, legLength: 0.98, earSize: 1.25, fluff: 0.3,
    base: '#8C99A6', accent: '#6C7986', belly: '#B9C4CE', eye: '#7FB77E',
    pattern: 'solido',
  },
  bengali: {
    species: 'gato',
    weightKg: 5.5, bodyWidth: 0.95, legLength: 1, fluff: 0.2,
    base: '#D9A257', accent: '#3A2A18', belly: '#F0DCB8', eye: '#7FB77E',
    pattern: 'manchado',
  },
  bosque_de_noruega: {
    species: 'gato',
    weightKg: 7, bodyWidth: 1.08, headSize: 1.02, fluff: 1, tailFluff: 1,
    tailLength: 1.3, earSize: 1.2,
    base: '#A88A66', accent: '#5E4630', belly: '#EADFC8', pattern: 'rayado',
  },
  britanico_de_pelo_corto: {
    species: 'gato',
    weightKg: 6, bodyWidth: 1.22, bodyHeight: 1, headSize: 1.08,
    snoutLength: 0.18, earSize: 0.95, earStyle: 'triangulo', fluff: 0.4,
    base: '#9AA6B0', accent: '#7A868F', belly: '#C4CED6', eye: '#D9A03A',
    pattern: 'solido',
  },
  himalayo: {
    species: 'gato',
    weightKg: 4.5, bodyWidth: 1.12, headSize: 1.08, snoutLength: 0.06,
    fluff: 0.95, tailFluff: 0.95,
    base: '#F2E7D5', accent: '#6B4A3A', belly: '#FAF3E7', eye: '#5AA8D6',
    pattern: 'colorpoint',
  },
  maine_coon: {
    species: 'gato',
    weightKg: 8, bodyWidth: 1.1, bodyLength: 1.12, legLength: 1,
    headSize: 1.05, earSize: 1.3, fluff: 1, tailFluff: 1, tailLength: 1.35,
    base: '#8A6A48', accent: '#4A3524', belly: '#DCC9A8', pattern: 'rayado',
  },
  mestizo_comun_europeo: { species: 'gato' },
  persa: {
    species: 'gato',
    weightKg: 4.5, bodyWidth: 1.16, bodyHeight: 1, headSize: 1.12,
    snoutLength: 0.02, earSize: 0.85, legLength: 0.8, fluff: 1, tailFluff: 1,
    base: '#EFE3CE', accent: '#CBB79A', belly: '#FAF3E7', eye: '#D9A03A',
    pattern: 'solido',
  },
  ragdoll: {
    species: 'gato',
    weightKg: 6.5, bodyWidth: 1.05, bodyLength: 1.08, fluff: 0.88,
    tailFluff: 0.95, tailLength: 1.3,
    base: '#F2EADD', accent: '#7A6A5E', belly: '#FBF6EE', eye: '#5AA8D6',
    pattern: 'colorpoint',
  },
  siames: {
    species: 'gato',
    weightKg: 4, bodyWidth: 0.78, bodyLength: 1.1, legLength: 1.05,
    headSize: 0.92, snoutLength: 0.45, earSize: 1.45, fluff: 0.15,
    tailLength: 1.32, tailFluff: 0.2,
    base: '#EDE0CB', accent: '#4A3A30', belly: '#F7EEDF', eye: '#5AA8D6',
    pattern: 'colorpoint',
  },
  sin_raza_gato: { species: 'gato' },
  sphynx_esfinge: {
    species: 'gato',
    weightKg: 3.5, bodyWidth: 0.82, bodyLength: 1.05, legLength: 1.05,
    headSize: 0.95, snoutLength: 0.4, earSize: 1.75, fluff: 0,
    tailFluff: 0, tailLength: 1.2,
    base: '#D6B49C', accent: '#B8927A', belly: '#E8CDBA', eye: '#B8A44E',
    pattern: 'solido',
  },
};

// Construido con RegExp para que el archivo quede en ASCII puro: un rango de
// marcas combinantes escrito literal se corrompe fácil al editar el archivo.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Normaliza el nombre del catálogo a la clave de la tabla. */
export function slugRaza(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Claves de la tabla compactadas a sólo letras, para el match aproximado. */
const INDICE_COMPACTO = Object.entries(RAZAS).map(([key, entrada]) => ({
  key,
  species: entrada.species,
  compact: key.replace(/_/g, ''),
}));

function esSubsecuencia(corta: string, larga: string): boolean {
  if (corta.length === 0) return false;
  let i = 0;
  for (const ch of larga) {
    if (ch === corta[i]) i += 1;
    if (i === corta.length) return true;
  }
  return false;
}

/**
 * Rescate para nombres a los que les falta un carácter.
 *
 * Hay filas viejas guardadas con la acentuación rota — "Siam?s" en vez de
 * "Siamés" — porque se cargaron desde un cliente que no podía representar la
 * tilde. El slug queda "siam_s", no matchea nada, y el animal terminaba con las
 * proporciones genéricas. Si al compactar el nombre queda como subsecuencia de
 * una sola raza de la misma especie, es esa.
 */
function matchAproximado(species: HueSpecies, slug: string): string | null {
  const compact = slug.replace(/_/g, '');
  if (compact.length < 4) return null;
  const candidatos = INDICE_COMPACTO.filter((e) => {
    if (e.species !== species) return false;
    const delta = e.compact.length - compact.length;
    return delta >= 0 && delta <= 2 && esSubsecuencia(compact, e.compact);
  });
  return candidatos.length === 1 ? candidatos[0]!.key : null;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, '0');
  return `#${hex(0)}${hex(8)}${hex(4)}`;
}

const PATTERNS: CoatPattern[] = ['solido', 'manchado', 'rayado', 'bicolor', 'tricolor'];
const EARS: EarStyle[] = ['erecta_punta', 'erecta_redonda', 'caida', 'semi'];

/**
 * Razas que no están en el catálogo (texto libre, cruzas): se derivan del hash
 * del nombre para que al menos sean estables y distintas entre sí.
 */
function perfilDerivado(species: HueSpecies, nombre: string): Morph {
  const promedio = species === 'gato' ? GATO_PROMEDIO : PERRO_PROMEDIO;
  const h = hashString(`${species}:${slugRaza(nombre)}`);
  const spread = (shift: number, amp: number) => (((h >> shift) & 0xff) / 255 - 0.5) * 2 * amp;
  const hue = species === 'gato' ? 20 + ((h >> 3) % 34) : 18 + ((h >> 3) % 30);
  const base = hslToHex(hue, 38 + ((h >> 6) % 26), 46 + ((h >> 9) % 20));
  return {
    ...promedio,
    weightKg: Math.max(2, promedio.weightKg * (1 + spread(2, 0.55))),
    bodyWidth: promedio.bodyWidth * (1 + spread(4, 0.18)),
    bodyHeight: promedio.bodyHeight * (1 + spread(6, 0.08)),
    bodyLength: promedio.bodyLength * (1 + spread(8, 0.22)),
    legLength: promedio.legLength * (1 + spread(10, 0.3)),
    headSize: promedio.headSize * (1 + spread(12, 0.1)),
    snoutLength: Math.max(0.05, Math.min(1, promedio.snoutLength + spread(14, 0.35))),
    earSize: promedio.earSize * (1 + spread(16, 0.3)),
    earStyle: species === 'gato' ? 'triangulo' : EARS[(h >> 18) % EARS.length]!,
    tailLength: Math.max(0.1, promedio.tailLength * (1 + spread(20, 0.35))),
    tailFluff: Math.max(0, Math.min(1, promedio.tailFluff + spread(22, 0.4))),
    fluff: Math.max(0, Math.min(1, promedio.fluff + spread(24, 0.45))),
    base,
    accent: hslToHex((hue + 200) % 360, 22, 26),
    belly: hslToHex(hue, 30, 88),
    pattern: PATTERNS[(h >> 26) % PATTERNS.length]!,
  };
}

/** Escala general del cuerpo a partir del peso, comprimida para que un Chihuahua siga siendo jugable. */
function escalaPorPeso(weightKg: number, species: HueSpecies): number {
  const ref = species === 'gato' ? 4.5 : 18;
  const rel = Math.log10(Math.max(1, weightKg) / ref);
  return Math.max(0.82, Math.min(1.2, 1 + rel * 0.34));
}

export type ResolvedBreed = BreedProfile & {
  /** Escala global (peso + edad) que aplica el renderer. */
  scale: number;
  ageStage: PetAgeStage;
};

export function resolveBreedProfile(
  species: HueSpecies,
  nombre: string | null,
  age: PetAgeStage,
  /** Id de la variante de pelaje elegida a mano en el editor. */
  variantId?: string | null
): ResolvedBreed {
  const promedio = species === 'gato' ? GATO_PROMEDIO : PERRO_PROMEDIO;
  const raw = (nombre ?? '').trim();
  const slug = slugRaza(raw);
  // "Sin raza" existe para perro y gato con el mismo nombre: desambiguar.
  const key = slug === 'sin_raza' ? `sin_raza_${species}` : slug;
  const entrada = RAZAS[key] ?? RAZAS[matchAproximado(species, slug) ?? ''];

  let morph: Morph;
  if (entrada) {
    const { species: _s, ...resto } = entrada;
    morph = { ...promedio, ...resto };
  } else if (raw.length > 0) {
    morph = perfilDerivado(species, raw);
  } else {
    morph = promedio;
  }

  if (species === 'tortuga' || species === 'otro') {
    morph = { ...morph, ...(species === 'tortuga' ? TORTUGA : OTRO) };
  }

  // La variante elegida a mano pisa los colores de la tabla, no las proporciones.
  if (variantId) {
    const v = variantesDeRaza(species, raw).find((x) => x.id === variantId);
    if (v) {
      morph = {
        ...morph,
        base: v.base,
        accent: v.accent,
        belly: v.belly,
        pattern: v.pattern ?? morph.pattern,
      };
    }
  }

  let scale = escalaPorPeso(morph.weightKg, species);
  if (age === 'cachorro') {
    // Los cachorros no son adultos en miniatura: cabeza grande, hocico corto,
    // patas cortas y orejas desproporcionadas.
    morph = {
      ...morph,
      headSize: morph.headSize * 1.22,
      snoutLength: morph.snoutLength * 0.55,
      legLength: morph.legLength * 0.82,
      bodyLength: 1 + (morph.bodyLength - 1) * 0.7,
      earSize: morph.earSize * 1.1,
    };
    scale *= 0.78;
  }

  return {
    ...morph,
    nombre: raw || (species === 'gato' ? 'Gato' : 'Perro'),
    species,
    scale,
    ageStage: age,
  };
}

const TORTUGA: Partial<Morph> = {
  weightKg: 3,
  bodyWidth: 1.35,
  bodyHeight: 0.85,
  bodyLength: 1.1,
  legLength: 0.4,
  headSize: 0.8,
  snoutLength: 0.35,
  earSize: 0,
  earStyle: 'caida',
  tailLength: 0.25,
  tailFluff: 0,
  fluff: 0,
  base: '#7BA05B',
  accent: '#4A6B36',
  belly: '#D8CE9A',
  eye: '#2B2B2B',
  nose: '#3A3A3A',
  pattern: 'manchado',
};

const OTRO: Partial<Morph> = {
  weightKg: 6,
  base: '#B9A98F',
  accent: '#8C7A5E',
  belly: '#E5DCC8',
  earStyle: 'erecta_redonda',
  pattern: 'solido',
};

/**
 * Colores reales que existen dentro de una misma raza.
 *
 * Un Labrador puede ser dorado, chocolate o negro y sigue siendo Labrador, así
 * que la raza sola no alcanza para definir el pelaje: esto es lo que el usuario
 * elige a mano en el editor.
 */
export type CoatVariant = {
  id: string;
  nombre: string;
  base: string;
  accent: string;
  belly: string;
  /** Algunas variantes cambian el patrón (un Labrador negro es sólido). */
  pattern?: CoatPattern;
};

const VARIANTES: Record<string, CoatVariant[]> = {
  labrador_retriever: [
    { id: 'dorado', nombre: 'Dorado', base: '#E5C489', accent: '#C9A467', belly: '#F7EBD2' },
    { id: 'chocolate', nombre: 'Chocolate', base: '#6B4226', accent: '#4A2C18', belly: '#8A5C38' },
    { id: 'negro', nombre: 'Negro', base: '#2A2624', accent: '#171514', belly: '#3D3835' },
  ],
  golden_retriever: [
    { id: 'dorado', nombre: 'Dorado', base: '#E3A857', accent: '#C98B3C', belly: '#F6DFAE' },
    { id: 'crema', nombre: 'Crema', base: '#EFDCB4', accent: '#D4BE93', belly: '#FAF0DC' },
    { id: 'cobrizo', nombre: 'Cobrizo', base: '#C9762F', accent: '#A15A20', belly: '#E5AE73' },
  ],
  caniche: [
    { id: 'blanco', nombre: 'Blanco', base: '#F4EDE2', accent: '#DCD1BE', belly: '#FBF7F0' },
    { id: 'negro', nombre: 'Negro', base: '#2B2827', accent: '#181615', belly: '#3E3A38' },
    { id: 'apricot', nombre: 'Apricot', base: '#E3B589', accent: '#C4935F', belly: '#F3D9BC' },
  ],
  chihuahua: [
    { id: 'cervato', nombre: 'Cervato', base: '#D9A15C', accent: '#B57C3C', belly: '#F2E3CC' },
    { id: 'negro_fuego', nombre: 'Negro y fuego', base: '#2C2724', accent: '#B5773F', belly: '#8A5C33', pattern: 'tricolor' },
    { id: 'blanco', nombre: 'Blanco', base: '#F2EDE3', accent: '#D8CFC0', belly: '#FCFAF5' },
  ],
  cocker_spaniel: [
    { id: 'canela', nombre: 'Canela', base: '#B5651D', accent: '#8A4A12', belly: '#EFD9B8' },
    { id: 'negro', nombre: 'Negro', base: '#292524', accent: '#161413', belly: '#3B3634' },
    { id: 'particolor', nombre: 'Particolor', base: '#F0E7D8', accent: '#7A5236', belly: '#FAF4EA', pattern: 'manchado' },
  ],
  pug: [
    { id: 'leonado', nombre: 'Leonado', base: '#E3C79A', accent: '#2B2320', belly: '#F4E7CE' },
    { id: 'negro', nombre: 'Negro', base: '#2A2523', accent: '#151312', belly: '#3C3633' },
  ],
  bulldog_frances: [
    { id: 'atigrado', nombre: 'Atigrado', base: '#8C8378', accent: '#4A443D', belly: '#EFE7DA' },
    { id: 'cervato', nombre: 'Cervato', base: '#D9B98C', accent: '#A8875C', belly: '#F2E5CE' },
    { id: 'pied', nombre: 'Pied', base: '#F2EEE6', accent: '#3A352F', belly: '#FBF9F4', pattern: 'manchado' },
  ],
  husky_siberiano: [
    { id: 'gris', nombre: 'Gris', base: '#6E6A66', accent: '#F5F2EC', belly: '#F7F4EF' },
    { id: 'negro', nombre: 'Negro', base: '#332F2C', accent: '#F2EFE8', belly: '#F7F4EF' },
    { id: 'rojizo', nombre: 'Rojizo', base: '#A9714A', accent: '#F5EFE4', belly: '#F8F3EA' },
  ],
  pastor_aleman: [
    { id: 'negro_fuego', nombre: 'Negro y fuego', base: '#B5813F', accent: '#2B241F', belly: '#D8B98A' },
    { id: 'sable', nombre: 'Sable', base: '#8E6A3E', accent: '#3A2E22', belly: '#B99A6C' },
    { id: 'negro', nombre: 'Negro', base: '#2A2624', accent: '#1A1817', belly: '#38332F' },
  ],
  salchicha_dachshund: [
    { id: 'negro_fuego', nombre: 'Negro y fuego', base: '#2B2320', accent: '#B5773F', belly: '#B5773F' },
    { id: 'rojo', nombre: 'Rojo', base: '#8B3E1B', accent: '#5A2810', belly: '#C08A5A', pattern: 'solido' },
    { id: 'chocolate', nombre: 'Chocolate', base: '#5A3A22', accent: '#A87E4A', belly: '#96703F' },
  ],
  // ------------------------------------------------------------------ gatos
  mestizo_comun_europeo: [
    { id: 'atigrado_marron', nombre: 'Atigrado marrón', base: '#A8865C', accent: '#6B5236', belly: '#E2D0B2', pattern: 'rayado' },
    { id: 'atigrado_gris', nombre: 'Atigrado gris', base: '#8A8C8E', accent: '#4E5052', belly: '#D9DBDC', pattern: 'rayado' },
    { id: 'negro', nombre: 'Negro', base: '#2A2827', accent: '#181717', belly: '#3B3836', pattern: 'solido' },
    { id: 'naranja', nombre: 'Naranja', base: '#D98B45', accent: '#A8632A', belly: '#F2D7B0', pattern: 'rayado' },
    { id: 'blanco_negro', nombre: 'Blanco y negro', base: '#F2EFE8', accent: '#2A2827', belly: '#FBF9F4', pattern: 'bicolor' },
  ],
  persa: [
    { id: 'crema', nombre: 'Crema', base: '#EFE3CE', accent: '#CBB79A', belly: '#FAF3E7' },
    { id: 'gris', nombre: 'Gris', base: '#9AA0A8', accent: '#767C84', belly: '#C6CBD1' },
    { id: 'negro', nombre: 'Negro', base: '#2E2B29', accent: '#1A1817', belly: '#413C39' },
  ],
  siames: [
    { id: 'seal', nombre: 'Seal point', base: '#EDE0CB', accent: '#4A3A30', belly: '#F7EEDF' },
    { id: 'chocolate', nombre: 'Chocolate point', base: '#F2E8D6', accent: '#6B4A34', belly: '#FAF4E9' },
    { id: 'blue', nombre: 'Blue point', base: '#E8E8E2', accent: '#5A6570', belly: '#F5F5F0' },
  ],
  ragdoll: [
    { id: 'seal', nombre: 'Seal point', base: '#F2EADD', accent: '#7A6A5E', belly: '#FBF6EE' },
    { id: 'blue', nombre: 'Blue point', base: '#F0F0EC', accent: '#68737E', belly: '#FAFAF7' },
  ],
  maine_coon: [
    { id: 'marron', nombre: 'Atigrado marrón', base: '#8A6A48', accent: '#4A3524', belly: '#DCC9A8', pattern: 'rayado' },
    { id: 'plateado', nombre: 'Plateado', base: '#A8AEB2', accent: '#5E656B', belly: '#DCE0E2', pattern: 'rayado' },
    { id: 'negro', nombre: 'Negro humo', base: '#33302E', accent: '#1C1A19', belly: '#4A4542', pattern: 'solido' },
  ],
};

/** Variantes genéricas cuando la raza no tiene una lista propia. */
const VARIANTES_GENERICAS: Record<'perro' | 'gato', CoatVariant[]> = {
  perro: [
    { id: 'leonado', nombre: 'Leonado', base: '#C99B6A', accent: '#8A6440', belly: '#F2E4CE' },
    { id: 'chocolate', nombre: 'Chocolate', base: '#6B4226', accent: '#452A18', belly: '#8A5C38' },
    { id: 'negro', nombre: 'Negro', base: '#2A2624', accent: '#171514', belly: '#3D3835' },
    { id: 'blanco', nombre: 'Blanco', base: '#F2EDE3', accent: '#D2C8B8', belly: '#FBF8F2' },
    { id: 'gris', nombre: 'Gris', base: '#8B8A87', accent: '#5E5D5A', belly: '#C4C2BE' },
  ],
  gato: [
    { id: 'atigrado_marron', nombre: 'Atigrado marrón', base: '#A8865C', accent: '#6B5236', belly: '#E2D0B2', pattern: 'rayado' },
    { id: 'atigrado_gris', nombre: 'Atigrado gris', base: '#8A8C8E', accent: '#4E5052', belly: '#D9DBDC', pattern: 'rayado' },
    { id: 'negro', nombre: 'Negro', base: '#2A2827', accent: '#181717', belly: '#3B3836', pattern: 'solido' },
    { id: 'naranja', nombre: 'Naranja', base: '#D98B45', accent: '#A8632A', belly: '#F2D7B0', pattern: 'rayado' },
    { id: 'blanco', nombre: 'Blanco', base: '#F4F1EA', accent: '#D8D2C6', belly: '#FCFBF7' },
  ],
};

/** Colorways disponibles para una raza, con la del catálogo primera. */
export function variantesDeRaza(species: HueSpecies, nombreRaza: string | null): CoatVariant[] {
  const slug = slugRaza(nombreRaza ?? '');
  const key = slug === 'sin_raza' ? `sin_raza_${species}` : slug;
  const propias = VARIANTES[key] ?? VARIANTES[matchAproximado(species, slug) ?? ''];
  if (propias) return propias;
  if (species === 'gato' || species === 'perro') return VARIANTES_GENERICAS[species];
  return [];
}

/** Texto corto para mostrar en la UI: "Labrador · 32 kg · adulto". */
export function describeBreed(b: ResolvedBreed): string {
  const kg = b.weightKg >= 10 ? Math.round(b.weightKg) : Math.round(b.weightKg * 10) / 10;
  const peso = b.ageStage === 'cachorro' ? `~${Math.round(b.weightKg * 0.4)} kg` : `${kg} kg`;
  return `${b.nombre} · ${peso}`;
}
