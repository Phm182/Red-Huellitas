import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle;
  /** 'auth' = más color; 'subtle' = casi plano con tinte */
  intensity?: 'auth' | 'subtle';
};

/**
 * Fondo con atmósfera (gradiente + blob). Evita fondos flat de una sola tinta.
 */
export function Atmosphere({ children, style, intensity = 'subtle' }: Props) {
  const { colors } = useTheme();
  const stops =
    intensity === 'auth'
      ? ([colors.gradientTop, colors.gradientMid, colors.gradientBottom] as const)
      : ([colors.backgroundAlt, colors.background, colors.background] as const);

  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={stops} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            backgroundColor: intensity === 'auth' ? colors.primarySoft : colors.accentSoft,
            opacity: intensity === 'auth' ? 0.85 : 0.55,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blobSecondary,
          {
            backgroundColor: intensity === 'auth' ? colors.accentSoft : colors.primarySoft,
            opacity: 0.5,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -60,
  },
  blobSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: 40,
    left: -70,
  },
});
