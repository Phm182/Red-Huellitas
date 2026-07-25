/**
 * Tipografía de marca.
 * Outfit = display / títulos con carácter.
 * Nunito = cuerpo amable, legible (mascotas + social).
 */
export const fonts = {
  display: 'Outfit_700Bold',
  displaySemi: 'Outfit_600SemiBold',
  displayMedium: 'Outfit_500Medium',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_500Medium',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  titleSm: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  section: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
} as const;
