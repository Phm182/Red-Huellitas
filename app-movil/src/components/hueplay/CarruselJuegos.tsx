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

const UMBRAL = 0.28;
/** A partir de qué velocidad (px/s) un flick empieza a saltar más de un juego de una. */
const VELOCIDAD_POR_SALTO = 900;

/**
 * Carrusel centrado de a un juego por vez, para el modo "Lista dinámica" de
 * la home de HuePlay. Mismo mecanismo de gesto que el de las solapas de
 * Huelligram (`app/(app)/(tabs)/index.tsx`: `Gesture.Pan` + `withSpring`,
 * con "goma" en las puntas) — extendido para saltar VARIOS juegos de una
 * con un flick fuerte, algo que ese carrusel no necesitaba.
 */
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

  const alCambiarPorGesto = useCallback((destino: number) => {
    hapticLeve();
    irA(destino, false);
  }, [irA]);

  const gesto = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const i = indiceRef.current;
      const w = anchoSV.value;
      const base = -i * w;
      const next = base + e.translationX;
      const min = -(juegos.length - 1) * w;
      if (next > 0) {
        arrastre.value = next * 0.35 - base;
      } else if (next < min) {
        arrastre.value = min + (next - min) * 0.35 - base;
      } else {
        arrastre.value = e.translationX;
      }
    })
    .onEnd((e) => {
      const i = indiceRef.current;
      const w = anchoSV.value;
      const recorrido = e.translationX / w;
      // Un flick fuerte salta varios juegos de una — "como una rueda". Un
      // swipe normal (sin mucha velocidad) sigue moviendo de a uno, igual
      // que el carrusel de Huelligram del que sale este patrón.
      const saltos = Math.max(1, Math.round(Math.abs(e.velocityX) / VELOCIDAD_POR_SALTO));
      let destino = i;
      if (saltos > 1) {
        destino = e.velocityX < 0 ? i + saltos : i - saltos;
      } else if (recorrido < -UMBRAL || e.velocityX < -700) {
        destino = i + 1;
      } else if (recorrido > UMBRAL || e.velocityX > 700) {
        destino = i - 1;
      }
      destino = Math.max(0, Math.min(juegos.length - 1, destino));
      const visual = -i * w + arrastre.value;
      arrastre.value = 0;
      offset.value = visual;
      offset.value = withSpring(-destino * w, { damping: 22, stiffness: 220, mass: 0.9 });
      if (destino !== i) {
        runOnJS(alCambiarPorGesto)(destino);
      }
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
