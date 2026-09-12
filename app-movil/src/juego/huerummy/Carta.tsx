import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { FichaRummy } from '../../types/hueplay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Color por ficha: 0 negro, 1 rojo, 2 azul, 3 amarillo — el mazo físico real de este juego (Ruibal/Rummikub). */
const COLORES = ['#2B2B2B', '#D6425E', '#3D8BE8', '#E0A82E'];

type Props = {
  carta: FichaRummy;
  tamano?: number;
  seleccionada?: boolean;
  onPress?: () => void;
  bocaAbajo?: boolean;
};

/**
 * Una ficha de HueRummy/HueBurako: número + color (no cartas de baraja — el
 * mazo real de este juego es de fichas numeradas, ver `inc/funciones/rummy.php`
 * para el porqué de la reescritura). El comodín se dibuja con una estrella en
 * vez de un número.
 *
 * Nota: acá NO se usan las animaciones declarativas `entering`/`exiting`/
 * `layout` de Reanimated — en este proyecto, en web, dejan el elemento con
 * `visibility: hidden` para siempre si la animación no llega a "asentarse".
 * El pop de entrada se arma a mano con `useSharedValue`/`withTiming` en un
 * `useEffect` al montar — mismo patrón ya probado en `PiezaDamas`/`Ficha`.
 */
export function Carta({ carta, tamano = 44, seleccionada, onPress, bocaAbajo }: Props) {
  const alto = tamano * 1.3;
  const escala = useSharedValue(1);
  const entrada = useSharedValue(0.5);
  const opacidad = useSharedValue(0);

  useEffect(() => {
    entrada.value = withTiming(1, { duration: 220 });
    opacidad.value = withTiming(1, { duration: 180 });
    // Sólo al montar: el pop de entrada no se repite en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    escala.value = withSpring(seleccionada ? 1.12 : 1, { damping: 12, stiffness: 220 });
  }, [seleccionada, escala]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [
      { translateY: seleccionada ? -tamano * 0.18 : 0 },
      { scale: escala.value * entrada.value },
    ],
  }));

  if (bocaAbajo) {
    return <Animated.View style={[styles.ficha, styles.dorso, { width: tamano, height: alto }, estiloAnimado]} />;
  }

  const esComodin = carta.color === -1;
  const color = esComodin ? '#B8860B' : COLORES[carta.color] ?? COLORES[0];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.ficha,
        { width: tamano, height: alto, borderColor: seleccionada ? '#3D8BE8' : '#D8D2C4' },
        estiloAnimado,
      ]}
    >
      {esComodin ? (
        <MaterialCommunityIcons name="star-four-points" size={tamano * 0.5} color={color} />
      ) : (
        <Text style={[styles.valor, { color, fontSize: tamano * 0.42 }]}>{carta.valor}</Text>
      )}
    </AnimatedPressable>
  );
}

/** Fila compacta de fichas boca abajo, para mostrar cuántas tiene un rival sin revelarlas. */
export function ManoRivalOculta({ cantidad, tamano = 30 }: { cantidad: number; tamano?: number }) {
  return (
    <View style={styles.filaOculta}>
      {Array.from({ length: cantidad }).map((_, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -tamano * 0.55 }}>
          <Carta carta={{ color: 0, valor: 1 }} tamano={tamano} bocaAbajo />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ficha: {
    backgroundColor: '#FBF8F0',
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  dorso: { backgroundColor: '#3D8BE8' },
  valor: { fontFamily: 'System', fontWeight: '700' },
  filaOculta: { flexDirection: 'row', alignItems: 'center' },
});
