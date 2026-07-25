import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const logoColor = require('../../assets/logo/logo.png');
const iconColor = require('../../assets/logo/icono.png');
const siluetaBlanca = require('../../assets/logo/rh-siluetas-blancas.png');
const siluetaNegra = require('../../assets/logo/rh-siluetas-negro.png');

interface LogoImageProps {
  variant?: 'full' | 'icon';
  style?: StyleProp<ImageStyle>;
}

/**
 * Logo a color en fondos claros; en fondos oscuros usa la silueta blanca
 * para mantener contraste (no hay versión a color para dark mode todavía).
 */
export function LogoImage({ variant = 'full', style }: LogoImageProps) {
  const { theme } = useTheme();

  let source = logoColor;
  if (variant === 'icon') {
    source = iconColor;
  } else if (theme === 'dark') {
    source = siluetaBlanca;
  }

  return <Image source={source} style={style} resizeMode="contain" />;
}

/** Silueta en negro, útil para textos/iconos sobre fondos claros e independiente del theme. */
export function LogoSiluetaNegra({ style }: { style?: StyleProp<ImageStyle> }) {
  return <Image source={siluetaNegra} style={style} resizeMode="contain" />;
}
