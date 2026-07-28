import React, { useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';

type Props = {
  paths: string[];
  /** Alto del carrusel. Por defecto 260. */
  alto?: number;
  /** Ancho disponible. Se mide solo si no se pasa. */
  radio?: number;
};

/**
 * Carrusel de fotos a ancho completo, con paginado y puntos.
 *
 * Reemplaza al `FlatList` horizontal de tarjetas de 260 px: con una sola foto
 * aquello dejaba un hueco a la derecha y no se leía como una galería, y con
 * varias no había forma de saber cuántas quedaban.
 *
 * El ancho se mide con `onLayout` en vez de usar `Dimensions.get('window')`
 * porque la app se dibuja dentro de una columna centrada que en pantallas
 * anchas es más angosta que la ventana; con las medidas de la ventana las fotos
 * se pasarían de largo.
 */
export function CarruselFotos({ paths, alto = 260, radio = 14 }: Props) {
  const { colors } = useTheme();
  const [ancho, setAncho] = useState(0);
  const [indice, setIndice] = useState(0);

  if (paths.length === 0) {
    return <View style={[styles.vacio, { height: alto, borderRadius: radio, backgroundColor: colors.surface }]} />;
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (ancho <= 0) return;
    setIndice(Math.round(e.nativeEvent.contentOffset.x / ancho));
  };

  return (
    <View onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ height: alto, borderRadius: radio }}
      >
        {paths.map((p, i) => (
          <Image
            key={`${p}-${i}`}
            source={{ uri: rhMediaUrl(p) }}
            style={{ width: ancho || undefined, height: alto, borderRadius: radio }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {paths.length > 1 ? (
        <View style={styles.puntos}>
          {paths.map((_, i) => (
            <View
              key={i}
              style={[
                styles.punto,
                {
                  backgroundColor: i === indice ? colors.primary : colors.border,
                  width: i === indice ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: { width: '100%' },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  punto: { height: 6, borderRadius: 3 },
});
