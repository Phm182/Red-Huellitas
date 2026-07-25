export type ThemeName = 'light' | 'dark';

/**
 * Dirección de marca: “red social de mascotas con onda Instagram”.
 * Coral vivo (huella) + teal profundo (naturaleza/confianza).
 * Evita el combo crema/terracota/serif genérico.
 */
export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  /** Gradiente atmosférico (auth / hubs) */
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  /** Anillo de historias / highlights */
  storyRingStart: string;
  storyRingEnd: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F7F6',
  backgroundAlt: '#EAF1EF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#121816',
  textMuted: '#5F6F6A',
  primary: '#E23B4A',
  primarySoft: '#FFE8EA',
  primaryText: '#FFFFFF',
  accent: '#0F766E',
  accentSoft: '#D8F3EF',
  border: '#D7E2DE',
  danger: '#D92D20',
  success: '#128A5E',
  warning: '#C47A12',
  gradientTop: '#FFE4E8',
  gradientMid: '#F4F7F6',
  gradientBottom: '#D9F0EC',
  storyRingStart: '#E23B4A',
  storyRingEnd: '#F59E0B',
  overlay: 'rgba(18, 24, 22, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0C1210',
  backgroundAlt: '#141C19',
  surface: '#17211E',
  surfaceElevated: '#1E2A26',
  text: '#F2F7F5',
  textMuted: '#9AADA6',
  primary: '#FF5C6A',
  primarySoft: '#3A1C22',
  primaryText: '#0C1210',
  accent: '#2DD4BF',
  accentSoft: '#14332F',
  border: '#2A3A35',
  danger: '#F97066',
  success: '#3DDC97',
  warning: '#F5B942',
  gradientTop: '#2A1218',
  gradientMid: '#0C1210',
  gradientBottom: '#0F2421',
  storyRingStart: '#FF5C6A',
  storyRingEnd: '#FBBF24',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const palette: Record<ThemeName, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
