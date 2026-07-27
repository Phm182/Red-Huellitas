/**
 * De qué color es la mascota.
 *
 * La versión anterior pintaba todo con el color de marca, así que un siamés y
 * un labrador negro salían los dos coral. El pelaje se deduce de la raza que el
 * usuario escribió, y si no se reconoce, del nombre — pero de forma estable, no
 * al azar: la misma mascota tiene que verse siempre igual.
 */

export type Pelaje = {
  /** Cuerpo. */
  base: string;
  /** Zonas en sombra: orejas, lomo, patas. */
  sombra: string;
  /** Panza, hocico y pecho. */
  claro: string;
  /** Puntas (siamés, husky): hocico, orejas, patas y cola. */
  puntas: string | null;
  /** Manchas encima del cuerpo, para bicolores y atigrados. */
  patron: 'liso' | 'manchas' | 'atigrado' | 'puntas';
  ojos: string;
};

/** Recetas por palabra clave de raza. La primera que matchea, gana. */
const RECETAS: { claves: string[]; pelaje: Pelaje }[] = [
  {
    claves: ['siames', 'siamés', 'himalayo', 'birmano', 'ragdoll'],
    pelaje: { base: '#E8DCC8', sombra: '#D6C4A8', claro: '#F5EEE2', puntas: '#4A3428', patron: 'puntas', ojos: '#3B7FC4' },
  },
  {
    claves: ['husky', 'malamute', 'siberiano'],
    pelaje: { base: '#6B7280', sombra: '#4B5563', claro: '#F3F4F6', puntas: '#374151', patron: 'puntas', ojos: '#4FA8DE' },
  },
  {
    claves: ['atigrado', 'tabby', 'tigrado', 'bengal', 'bengalí'],
    pelaje: { base: '#C08A4A', sombra: '#8B5E2F', claro: '#E8CFA8', puntas: null, patron: 'atigrado', ojos: '#4E7A2E' },
  },
  {
    claves: ['labrador', 'golden', 'retriever', 'cocker'],
    pelaje: { base: '#DCA85C', sombra: '#B4832F', claro: '#F0DDB4', puntas: null, patron: 'liso', ojos: '#5A3820' },
  },
  {
    claves: ['negro', 'pantera', 'schnauzer', 'rottweiler', 'doberman'],
    pelaje: { base: '#3A3A3E', sombra: '#232326', claro: '#5A5A60', puntas: null, patron: 'liso', ojos: '#C9A227' },
  },
  {
    claves: ['blanco', 'maltes', 'maltés', 'bichon', 'bichón', 'samoyedo', 'persa'],
    pelaje: { base: '#F2EFE9', sombra: '#D8D3C8', claro: '#FFFFFF', puntas: null, patron: 'liso', ojos: '#5A3820' },
  },
  {
    claves: ['beagle', 'bulldog', 'boxer', 'bóxer', 'border', 'collie', 'pastor'],
    pelaje: { base: '#B5703C', sombra: '#7E4A24', claro: '#F3E4CE', puntas: null, patron: 'manchas', ojos: '#4A2E18' },
  },
  {
    claves: ['gris', 'ruso', 'cartujo', 'chartreux', 'weimaraner'],
    pelaje: { base: '#8B9199', sombra: '#666C74', claro: '#C2C7CD', puntas: null, patron: 'liso', ojos: '#4E7A2E' },
  },
  {
    claves: ['naranja', 'naranjo', 'calico', 'calicó', 'carey', 'pelirrojo', 'setter'],
    pelaje: { base: '#E08A3C', sombra: '#B25F1E', claro: '#F7DCB8', puntas: null, patron: 'manchas', ojos: '#4E7A2E' },
  },
  {
    claves: ['caniche', 'poodle', 'chihuahua', 'salchicha', 'dachshund'],
    pelaje: { base: '#C98F5E', sombra: '#9A6538', claro: '#EBD2B4', puntas: null, patron: 'liso', ojos: '#4A2E18' },
  },
];

/** Cuando la raza no dice nada: una paleta estable derivada del nombre. */
const GENERICAS: Pelaje[] = [
  { base: '#C99A63', sombra: '#9B7039', claro: '#EEDCC0', puntas: null, patron: 'liso', ojos: '#4A2E18' },
  { base: '#8D8F97', sombra: '#666870', claro: '#C7C9CF', puntas: null, patron: 'liso', ojos: '#4E7A2E' },
  { base: '#E2A85E', sombra: '#B87A2E', claro: '#F6E2C2', puntas: null, patron: 'manchas', ojos: '#5A3820' },
  { base: '#4A4A50', sombra: '#2E2E33', claro: '#6E6E76', puntas: null, patron: 'liso', ojos: '#C9A227' },
  { base: '#EFE9DF', sombra: '#CFC7B8', claro: '#FFFFFF', puntas: null, patron: 'manchas', ojos: '#4A2E18' },
];

/** Hash estable: la misma mascota saca siempre el mismo pelaje. */
function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pelajeDe(especie: string, raza: string | null, nombre: string): Pelaje {
  const clave = (raza ?? '').toLowerCase().trim();

  if (clave) {
    const receta = RECETAS.find((r) => r.claves.some((c) => clave.includes(c)));
    if (receta) return receta.pelaje;
  }

  // Los conejos y demás tienden a claros; perros y gatos, a la paleta completa.
  const pool = especie === 'otro' ? GENERICAS.filter((p) => p.base !== '#4A4A50') : GENERICAS;
  return pool[hash(nombre + clave) % pool.length];
}
