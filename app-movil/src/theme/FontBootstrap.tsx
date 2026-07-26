import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from './ThemeProvider';

/** Fuentes base: si fallan las de historias, la app igual arranca. */
export function FontBootstrap({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = useState(false);

  const [baseLoaded] = useFonts({
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [storyLoaded] = useFonts({
    BebasNeue_400Regular,
    Pacifico_400Regular,
    PlayfairDisplay_700Bold,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // No bloquear la app eterna si una fuente de historias no resuelve.
  if (!baseLoaded && !timedOut) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // storyLoaded se usa para forzar el hook; el fallback de tipografía está en storyFontFamily
  void storyLoaded;

  return <>{children}</>;
}
