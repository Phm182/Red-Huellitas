import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import type { MapaPunto, MapaSesion } from '../../types/mapa';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  sesion: MapaSesion;
  puntos: MapaPunto[];
  centro: { lat: number; lng: number };
  miUbicacion?: { lat: number; lng: number } | null;
  irA?: { lat: number; lng: number; nonce: number } | null;
  oscuro: boolean;
  onSeleccion: (puntos: MapaPunto[]) => void;
  onMover?: (centro: { lat: number; lng: number }) => void;
};

/**
 * Versión nativa del lienzo — todavía no dibuja el mapa.
 *
 * `mapbox-gl` es una librería de DOM y no corre en React Native. Para tener el
 * mapa en el celular hace falta `@rnmapbox/maps`, que es un módulo nativo: no
 * funciona en Expo Go y pide un `expo prebuild` con un token secreto de
 * descarga (`sk.`) además del público que ya está configurado.
 *
 * Mientras tanto esto avisa en vez de romper, y el resto de la pantalla —los
 * filtros, la lista de resultados, el ingreso a cada publicación— anda igual
 * porque no dependen del lienzo.
 */
/**
 * En nativo todavía no hay mapa que reutilizar, así que nunca hay sesión viva
 * y la pantalla siempre le pregunta al servidor. Existe para que el import
 * funcione igual en las dos plataformas.
 */
export function sesionMapaViva(_oscuro: boolean): null {
  return null;
}

export function MapaLienzo({ puntos }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      <Ionicons name="planet-outline" size={54} color={colors.primary} />
      <Text style={[styles.titulo, { color: colors.text }]}>{t('mapa.nativoPendienteTitulo')}</Text>
      <Text style={[styles.cuerpo, { color: colors.textMuted }]}>
        {t('mapa.nativoPendienteCuerpo', { cantidad: puntos.length })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  titulo: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  cuerpo: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
