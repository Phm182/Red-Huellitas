import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { palette, ThemeColors, ThemeName } from './colors';

const STORAGE_KEY = '@red_huellitas/theme';

/** Preferencia guardada: seguir al dispositivo o forzar claro/oscuro. */
export type ThemePreference = 'system' | ThemeName;

interface ThemeContextValue {
  /** Tema efectivo aplicado a la UI. */
  theme: ThemeName;
  /** Preferencia del usuario (puede ser system). */
  preference: ThemePreference;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveTheme(preference: ThemePreference, scheme: ColorSchemeName): ThemeName {
  if (preference === 'system') {
    return scheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreferenceState(saved);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const theme = resolveTheme(preference, systemScheme);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const setTheme = (next: ThemeName) => setPreference(next);

  const toggleTheme = () => setPreference(theme === 'light' ? 'dark' : 'light');

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, colors: palette[theme], toggleTheme, setTheme, setPreference }),
    [theme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
}
