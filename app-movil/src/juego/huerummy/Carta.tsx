import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { CartaRummy } from '../../types/hueplay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Símbolo y color por palo: 0 picas, 1 corazones, 2 diamantes, 3 tréboles. */
const PALOS: { simbolo: string; color: string }[] = [
  { simbolo: '♠', color: '#2B2B2B' },
  { simbolo: '♥', color: '#D6425E' },
  { simbolo: '♦', color: '#D6425E' },
  { simbolo: '♣', color: '#2B2B2B' },
];

export function textoValor(valor: number): string {
  if (valor === 1) return 'A';
  if (valor === 11) return 'J';
  if (valor === 12) return 'Q';
  if (valor === 13) return 'K';
  return String(valor);
}

type Props = {
  carta: CartaRummy;
  tamano?: number;
  seleccionada?: boolean;
  onPress?: () => void;
  bocaAbajo?: boolean;
};

/**
 * Una carta de HueRummy. Al montarse (aparece en la mano, en un meld, o en
 * el descarte) hace un pop de entrada; al seleccionarla se levanta un poco.
 *
 * Nota: acá NO se usan las animaciones declarativas `entering`/`exiting`/
 * `layout` de Reanimated — en este proyecto, en web, dejan el elemento con
 * `visibility: hidden` para siempre si la animación no llega a "asentarse"
 * (se vio literalmente así en el navegador: la carta estaba en el DOM con
 * el valor y el palo correctos, pero invisible). El pop de entrada acá se
 * arma a mano con `useSharedValue`/`withTiming` en un `useEffect` al
 * montar — mismo patrón ya probado en `PiezaDamas`/`Ficha` (Ludo).
 */
export function Carta({ carta, tamano = 56, seleccionada, onPress, bocaAbajo }: Props) {
  const alto = tamano * 1.4;
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
    return <Animated.View style={[styles.carta, styles.dorso, { width: tamano, height: alto }, estiloAnimado]} />;
  }

  const { simbolo, color } = PALOS[carta.palo] ?? PALOS[0];
  const texto = textoValor(carta.valor);

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.carta,
        { width: tamano, height: alto, borderColor: seleccionada ? '#3D8BE8' : '#D8D2C4' },
        estiloAnimado,
      ]}
    >
      <Text style={[styles.valor, { color, fontSize: tamano * 0.32 }]}>{texto}</Text>
      <Text style={[styles.palo, { color, fontSize: tamano * 0.38 }]}>{simbolo}</Text>
    </AnimatedPressable>
  );
}

/** Fila compacta de cartas boca abajo, para mostrar cuántas tiene un rival sin revelarlas. */
export function ManoRivalOculta({ cantidad, tamano = 34 }: { cantidad: number; tamano?: number }) {
  return (
    <View style={styles.filaOculta}>
      {Array.from({ length: cantidad }).map((_, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -tamano * 0.55 }}>
          <Carta carta={{ palo: 0, valor: 1 }} tamano={tamano} bocaAbajo />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  carta: {
    backgroundColor: '#FFFFFF',
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
  palo: { marginTop: -2 },
  filaOculta: { flexDirection: 'row', alignItems: 'center' },
});
