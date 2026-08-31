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
export type VarianteSkin = 'primaria' | 'secundaria';

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
 * Si los dos jugadores eligieron el mismo skin de ficha, el retado (nunca
 * el retador) cede a la variante secundaria de esa misma familia — regla
 * determinística por `soyRetador`, así los dos clientes calculan lo mismo
 * sin negociar nada por red.
 */
export function resolverSkinsPartido(
  skinRetador: SkinFichaId,
  skinRetado: SkinFichaId
): { retador: VarianteSkin; retado: VarianteSkin } {
  if (skinRetador !== skinRetado) return { retador: 'primaria', retado: 'primaria' };
  return { retador: 'primaria', retado: 'secundaria' };
}

/**
 * Sólo hay una pelota en pantalla — no puede mostrar dos skins a la vez.
 * Se usa siempre el skin de pelota del retador (determinístico, ambos
 * clientes lo calculan igual vía `desafio.soyRetador`).
 */
export function skinPelotaDelPartido(skinRetador: SkinPelotaId): SkinPelotaId {
  return skinRetador;
}
