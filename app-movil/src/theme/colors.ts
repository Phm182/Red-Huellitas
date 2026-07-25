export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  border: string;
  danger: string;
  success: string;
}

export const lightColors: ThemeColors = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  text: '#2A2420',
  textMuted: '#7A7168',
  primary: '#E8873A',
  primaryText: '#FFFFFF',
  border: '#E5DFD6',
  danger: '#D64545',
  success: '#3C9A5F',
};

export const darkColors: ThemeColors = {
  background: '#1C1815',
  surface: '#2A2420',
  text: '#F5F1EA',
  textMuted: '#A69C90',
  primary: '#F0A05E',
  primaryText: '#1C1815',
  border: '#3A332C',
  danger: '#E57373',
  success: '#66BB8A',
};

export const palette: Record<ThemeName, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
