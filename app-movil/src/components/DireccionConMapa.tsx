import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';

type Props = {
  /** Calle y número. Si falta se muestra sólo el barrio. */
  direccion?: string | null;
  /** Barrio o zona; el dato que siempre está. */
  zonaDescripcion?: string | null;
  lat: number;
  lng: number;
};

/**
 * Dirección de un lugar público, con acceso al mapa.
 *
 * Va en un componente y no repetido en cada pantalla porque son tres módulos
 * (veterinarias, refugios y campañas) que muestran exactamente lo mismo, y el
 * día que cambie el formato de la dirección conviene tocarlo una vez.
 *
 * **Sólo para lugares públicos.** Las publicaciones de personas no llevan
 * dirección — su punto en el mapa va difuminado a propósito (ver
 * rh_geo_difuminar en el backend), así que mostrar un botón de "ver en mapa"
 * ahí sugeriría una precisión que no existe.
 */
export function DireccionConMapa({ direccion, zonaDescripcion, lat, lng }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const verEnMapa = () => {
    hapticLeve();
    // El mapa lee lat/lng de la ruta y vuela hasta ahí al abrirse.
    router.push({ pathname: '/(app)/mapa', params: { lat: String(lat), lng: String(lng) } } as never);
  };

  return (
    <View style={[styles.caja, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name="location" size={18} color={colors.primary} style={{ marginTop: 1 }} />

      <View style={{ flex: 1 }}>
        {direccion ? <Text style={[styles.direccion, { color: colors.text }]}>{direccion}</Text> : null}
        {zonaDescripcion ? (
          <Text style={[styles.zona, { color: colors.textMuted }]}>{zonaDescripcion}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={verEnMapa}
        style={[styles.boton, { borderColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={t('mapa.verEnMapa')}
      >
        <Ionicons name="map" size={15} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
          {t('mapa.verEnMapa')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  direccion: { fontSize: 15, fontWeight: '600' },
  zona: { fontSize: 13, marginTop: 1 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
