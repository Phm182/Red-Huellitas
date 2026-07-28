import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Siluetas v2: contraste correcto en claro / oscuro (login, header, auth). */
const siluetaBlanca = require('../../assets/logo/rh-siluetas-blancas-2.png');
const siluetaNegra = require('../../assets/logo/rh-siluetas-negro-2.png');

interface LogoImageProps {
  /** `icon` = tamaño compacto (header); misma asset según tema. */
  variant?: 'full' | 'icon';
  style?: StyleProp<ImageStyle>;
}

/**
 * Logo por tema: silueta negra en claro, blanca en oscuro.
 */
export function LogoImage({ style }: LogoImageProps) {
  const { theme } = useTheme();
  const source = theme === 'dark' ? siluetaBlanca : siluetaNegra;

  return <Image source={source} style={style} resizeMode="contain" />;
}

/** Silueta negra fija (chips / avatares de fallback sobre fondos claros). */
export function LogoSiluetaNegra({ style }: { style?: StyleProp<ImageStyle> }) {
  return <Image source={siluetaNegra} style={style} resizeMode="contain" />;
}

/** Silueta blanca fija (sobre fondos oscuros / media). */
export function LogoSiluetaBlanca({ style }: { style?: StyleProp<ImageStyle> }) {
  return <Image source={siluetaBlanca} style={style} resizeMode="contain" />;
}
