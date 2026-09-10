import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';
import { BotonFavorito } from './BotonFavorito';

export type JuegoCarrusel = {
  id: string;
  titulo: string;
  icono: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

type Props = {
  juegos: JuegoCarrusel[];
  favoritos: string[];
  modosPorJuego: Record<string, 'solo' | 'multiplayer' | 'ambos'>;
  onFavoritoCambiar: (juegoCodigo: string, favorito: boolean) => void;
  onAbrir: (juego: JuegoCarrusel) => void;
  labelModo: (modo: 'solo' | 'multiplayer' | 'ambos') => string;
  alto?: number;
};

/**
 * Carrusel centrado de a un juego por vez, para el modo "Lista dinámica" de
 * la home de HuePlay.
 *
 * Gira como una RULETA: el dedo lo mueve libre, y al soltar proyecta hasta
 * dónde llegaría con ese envión y va ahí con un `withSpring` al que se le
 * pasa la velocidad del gesto — un empujón flojo pasa un juego, uno fuerte
 * se lleva varios y frena solo. La velocidad se mide a mano en `onUpdate`
 * (RNGH la deja en 0 seguido en Android) para que la proyección sea real.
 *
 * Antes usaba `withDecay` con un callback que arrancaba otro `withSpring`
 * sobre el mismo shared value: eso entraba en recursión infinita
 * ("Maximum call stack size exceeded" en el propio callback) y el carrusel
 * quedaba clavado en el mismo juego (queja: "hace como que se mueve,
 * siempre es 1 y repite la misma opción").
 */
/** Cuánto pesa la velocidad del envión al proyectar el destino (seg). Más
 * alto = un flick fuerte se lleva más juegos. */
const FACTOR_PROYECCION = 0.14;
/** La tarjeta ocupa esta fracción del ancho disponible — de punta a punta
 * quedaba desproporcionada (un panel enorme para un ícono y dos líneas de
 * texto); así queda un tamaño de tarjeta prolijo, con margen de sobra para
 * las flechas a los costados. */
const FRACCION_TARJETA = 0.56;

export function CarruselJuegos({ juegos, favoritos, modosPorJuego, onFavoritoCambiar, onAbrir, labelModo, alto = 200 }: Props) {
  const { colors } = useTheme();
  const [indice, setIndice] = useState(0);
  const [ancho, setAncho] = useState(320);
  const indiceRef = useRef(0);
  const anchoSV = useSharedValue(320 * FRACCION_TARJETA);
  const offset = useSharedValue(0);
  const arrastre = useSharedValue(0);
  // Medición de velocidad a mano durante el arrastre (px/seg), con suavizado
  // — `e.velocityX` de RNGH viene 0 casi siempre en este Android.
  const velSV = useSharedValue(0);
  const tPrevSV = useSharedValue(0);
  const xPrevSV = useSharedValue(0);

  const cardAncho = Math.round(ancho * FRACCION_TARJETA);
  const margen = (ancho - cardAncho) / 2;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w <= 0 || w === ancho) return;
    setAncho(w);
    const cw = Math.round(w * FRACCION_TARJETA);
    anchoSV.value = cw;
    offset.value = -indiceRef.current * cw;
  }, [ancho, anchoSV, offset]);

  // La lista puede cambiar de largo u orden en cualquier momento (el
  // buscador filtra, o marcar un favorito reordena) — sin esto, `indice`
  // quedaba apuntando a una posición que ya no existe (crash real: el
  // buscador dejaba un solo resultado con `indice` todavía en 1). Ubica de
  // nuevo el MISMO juego que se estaba viendo por su id; si ya no está en
  // la lista (lo tapó el buscador), lo acota a los límites.
  const juegosAnterioresRef = useRef(juegos);
  useEffect(() => {
    const anteriores = juegosAnterioresRef.current;
    juegosAnterioresRef.current = juegos;
    if (anteriores === juegos) return;
    const idActual = anteriores[indiceRef.current]?.id;
    const nuevoIndice = idActual ? juegos.findIndex((j) => j.id === idActual) : -1;
    const clamped = nuevoIndice >= 0 ? nuevoIndice : Math.max(0, Math.min(juegos.length - 1, indiceRef.current));
    indiceRef.current = clamped;
    setIndice(clamped);
    offset.value = -clamped * anchoSV.value;
  }, [juegos, offset, anchoSV]);

  const irA = useCallback((i: number, animar: boolean) => {
    const clamped = Math.max(0, Math.min(juegos.length - 1, i));
    indiceRef.current = clamped;
    setIndice(clamped);
    const w = anchoSV.value;
    if (animar) {
      offset.value = withSpring(-clamped * w, { damping: 22, stiffness: 220, mass: 0.9 });
    } else {
      offset.value = -clamped * w;
    }
  }, [juegos.length, anchoSV, offset]);

  const fijarIndice = useCallback((destino: number) => {
    const clamped = Math.max(0, Math.min(juegos.length - 1, destino));
    if (clamped !== indiceRef.current) hapticLeve();
    indiceRef.current = clamped;
    setIndice(clamped);
  }, [juegos.length]);

  const gesto = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-26, 26])
    .onBegin(() => {
      'worklet';
      tPrevSV.value = Date.now();
      xPrevSV.value = 0;
      velSV.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      // Velocidad instantánea suavizada (px/seg) a partir de los samples.
      const ahora = Date.now();
      const dt = ahora - tPrevSV.value;
      if (dt > 8) {
        const inst = ((e.translationX - xPrevSV.value) / dt) * 1000;
        velSV.value = velSV.value * 0.7 + inst * 0.3;
        tPrevSV.value = ahora;
        xPrevSV.value = e.translationX;
      }
      const w = anchoSV.value;
      const min = -(juegos.length - 1) * w;
      const bruto = offset.value + e.translationX;
      // Goma en las puntas: si el dedo se pasa del primer/último, el track
      // sólo lo sigue un tercio.
      if (bruto > 0) arrastre.value = e.translationX - bruto * 0.66;
      else if (bruto < min) arrastre.value = e.translationX - (bruto - min) * 0.66;
      else arrastre.value = e.translationX;
    })
    .onEnd((e) => {
      'worklet';
      const w = anchoSV.value;
      const maxIdx = juegos.length - 1;
      // Plegar el arrastre en el offset y proyectar el destino desde ahí:
      // dónde caería la "rueda" con este envión. Un solo `withSpring` (con
      // la velocidad del gesto) la lleva ahí y la frena — sin callbacks
      // anidados que recursen.
      offset.value = offset.value + arrastre.value;
      arrastre.value = 0;
      const vx = Math.abs(e.velocityX) > Math.abs(velSV.value) ? e.velocityX : velSV.value;
      const proyectado = offset.value + vx * FACTOR_PROYECCION;
      let destino = Math.round(-proyectado / w);
      if (destino < 0) destino = 0;
      if (destino > maxIdx) destino = maxIdx;
      offset.value = withSpring(-destino * w, { velocity: vx, damping: 18, stiffness: 90, mass: 1 });
      runOnJS(fijarIndice)(destino);
    });

  const estiloTrack = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value + arrastre.value }],
  }));

  if (juegos.length === 0) {
    return null;
  }

  // Defensa además del efecto de arriba: el efecto corrige `indice` recién
  // en el próximo commit, pero este render (el que sigue a que la lista se
  // haga más corta) todavía puede ejecutarse con el `indice` viejo.
  const indiceSeguro = Math.min(indice, juegos.length - 1);
  return (
    <View style={[styles.contenedor, { height: alto }]} onLayout={onLayout}>
      <View style={[styles.ventana, { width: cardAncho, height: alto }]}>
        <GestureDetector gesture={gesto}>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Animated.View style={[styles.track, { width: cardAncho * juegos.length }, estiloTrack]}>
              {juegos.map((j) => {
                const modo = modosPorJuego[j.id];
                return (
                  <Pressable
                    key={j.id}
                    style={[styles.pagina, { width: cardAncho }]}
                    onPress={() => onAbrir(j)}
                  >
                    <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.estrellaFila}>
                        <BotonFavorito
                          juegoCodigo={j.id}
                          esFavorito={favoritos.includes(j.id)}
                          onCambiar={onFavoritoCambiar}
                          size={20}
                        />
                      </View>
                      <View style={[styles.icono, { backgroundColor: `${j.color}22` }]}>
                        <MaterialCommunityIcons name={j.icono} size={38} color={j.color} />
                      </View>
                      <Text style={[styles.titulo, { color: colors.text }]} numberOfLines={1}>
                        {j.titulo}
                      </Text>
                      {modo ? (
                        <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
                          {labelModo(modo)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      {indiceSeguro > 0 ? (
        <Pressable
          hitSlop={12}
          onPress={() => {
            hapticLeve();
            irA(indiceSeguro - 1, true);
          }}
          style={[styles.flecha, { left: Math.max(4, margen - 44), backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      {indiceSeguro < juegos.length - 1 ? (
        <Pressable
          hitSlop={12}
          onPress={() => {
            hapticLeve();
            irA(indiceSeguro + 1, true);
          }}
          style={[styles.flecha, { right: Math.max(4, margen - 44), backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { justifyContent: 'center', alignItems: 'center' },
  ventana: { alignSelf: 'center' },
  track: { flexDirection: 'row', height: '100%' },
  pagina: { height: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tarjeta: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  estrellaFila: { position: 'absolute', top: 8, right: 8 },
  icono: { width: 62, height: 62, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 15 },
  flecha: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
