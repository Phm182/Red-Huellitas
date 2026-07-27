import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { JuegoAnimo } from '../../types';
import { useTheme } from '../../theme/ThemeProvider';

/** Las acciones que la mascota sabe actuar. */
export type AccionViva = 'alimentar' | 'jugar' | 'banar' | 'dormir' | null;

type Props = {
  especie: string;
  animo: JuegoAnimo;
  /** Cambiar esto dispara la actuación; null vuelve al reposo. */
  accion: AccionViva;
  /** Se incrementa desde afuera para re-disparar la misma acción. */
  disparo?: number;
  tamano?: number;
};

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * La mascota del juego, **dibujada por código**.
 *
 * Antes acá iba la foto real (o una generada con IA) con una animación de
 * respiración encima. El problema es de fondo: una imagen no puede comer,
 * saltar ni dormirse — por más avatar que genere la IA, sigue siendo un PNG
 * quieto. Para que la mascota *actúe* hay que dibujarla en partes y animar
 * cada parte por separado, que es lo que hace este componente.
 *
 * Ventaja lateral: no depende de ninguna API, funciona sin conexión y no
 * gasta cuota.
 *
 * Cada acción tiene su gesto:
 * - **alimentar**: baja la cabeza al plato y mastica.
 * - **jugar**: salta y menea la cola fuerte.
 * - **bañar**: se sacude de lado a lado y salen burbujas.
 * - **dormir**: se acurruca, cierra los ojos y aparecen las Z.
 */
export function MascotaViva({ especie, animo, accion, disparo = 0, tamano = 200 }: Props) {
  const { colors } = useTheme();
  const esGato = especie === 'gato';

  // --- Estado de reposo: respira y parpadea ---
  const respirar = useSharedValue(1);
  const cabeza = useSharedValue(0);
  const cola = useSharedValue(0);
  const cuerpoY = useSharedValue(0);
  const parpadeo = useSharedValue(1);
  const inclinacion = useSharedValue(0);
  const burbujas = useSharedValue(0);
  const zzz = useSharedValue(0);
  const plato = useSharedValue(0);

  const durmiendo = accion === 'dormir';

  useEffect(() => {
    // La respiración cambia con el ánimo: más lenta y chata cuando está bajón.
    const dur = durmiendo ? 2800 : animo === 'decaido' ? 2400 : animo === 'aburrido' ? 1900 : 1300;
    const amp = durmiendo ? 1.05 : animo === 'decaido' ? 1.02 : 1.05;

    respirar.value = withRepeat(
      withSequence(
        withTiming(amp, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Cuando está decaída, la cabeza cae; dormida, se acurruca más.
    inclinacion.value = withTiming(durmiendo ? 12 : animo === 'decaido' ? 7 : 0, { duration: 500 });
  }, [animo, durmiendo, respirar, inclinacion]);

  // Cola: sólo se menea si está despierta, y más rápido cuanto mejor el ánimo.
  useEffect(() => {
    if (durmiendo) {
      cola.value = withTiming(0, { duration: 400 });
      return;
    }
    const dur = animo === 'feliz' ? 260 : animo === 'bien' ? 420 : 900;
    cola.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: dur, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [animo, durmiendo, cola]);

  // Parpadeo: cerrar los ojos un instante cada tanto. Dormida quedan cerrados.
  useEffect(() => {
    if (durmiendo) {
      parpadeo.value = withTiming(0.06, { duration: 500 });
      return;
    }
    parpadeo.value = 1;
    const id = setInterval(() => {
      parpadeo.value = withSequence(
        withTiming(0.1, { duration: 90 }),
        withTiming(1, { duration: 120 })
      );
    }, 3200);
    return () => clearInterval(id);
  }, [durmiendo, parpadeo]);

  // --- Actuaciones ---
  useEffect(() => {
    if (!accion) return;

    if (accion === 'alimentar') {
      // Aparece el plato, baja la cabeza y mastica cuatro veces.
      plato.value = withSequence(withTiming(1, { duration: 200 }), withDelay(2200, withTiming(0, { duration: 300 })));
      cabeza.value = withSequence(
        withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
        withRepeat(
          withSequence(withTiming(0.82, { duration: 150 }), withTiming(1, { duration: 150 })),
          4,
          false
        ),
        withTiming(0, { duration: 320 })
      );
    }

    if (accion === 'jugar') {
      // Dos saltos con squash: sube rápido y aterriza con resorte.
      cuerpoY.value = withSequence(
        withTiming(-38, { duration: 260, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 7, stiffness: 190 }),
        withTiming(-26, { duration: 230, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 8, stiffness: 200 })
      );
    }

    if (accion === 'banar') {
      // Sacudida lateral clásica de perro mojado + burbujas subiendo.
      inclinacion.value = withSequence(
        withRepeat(withSequence(withTiming(-13, { duration: 90 }), withTiming(13, { duration: 90 })), 6, true),
        withTiming(0, { duration: 200 })
      );
      burbujas.value = withSequence(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 250 })
      );
    }

    if (accion === 'dormir') {
      zzz.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
    } else {
      zzz.value = withTiming(0, { duration: 300 });
    }
  }, [accion, disparo, cabeza, cuerpoY, inclinacion, burbujas, zzz, plato]);

  const estiloCuerpo = useAnimatedStyle(() => ({
    transform: [
      { translateY: cuerpoY.value },
      { scale: respirar.value },
      { rotate: `${inclinacion.value}deg` },
    ],
  }));

  const estiloCabeza = useAnimatedStyle(() => ({
    transform: [{ translateY: cabeza.value * tamano * 0.11 }, { scaleY: 1 - cabeza.value * 0.05 }],
  }));

  const estiloCola = useAnimatedStyle(() => ({
    transform: [{ rotate: `${cola.value * (animo === 'feliz' ? 34 : 20)}deg` }],
  }));

  const estiloOjos = useAnimatedStyle(() => ({ transform: [{ scaleY: parpadeo.value }] }));
  const estiloPlato = useAnimatedStyle(() => ({ opacity: plato.value }));

  const estiloBurbujas = useAnimatedStyle(() => ({
    opacity: burbujas.value > 0 ? 1 - burbujas.value * 0.6 : 0,
    transform: [{ translateY: -burbujas.value * tamano * 0.42 }],
  }));

  const estiloZzz = useAnimatedStyle(() => ({
    opacity: durmiendo ? 1 - zzz.value : 0,
    transform: [{ translateY: -zzz.value * tamano * 0.3 }, { translateX: zzz.value * tamano * 0.12 }],
  }));

  const w = tamano;
  const h = tamano;
  const pelo = colors.primary;
  const peloOscuro = colors.accent;

  return (
    <View style={[styles.escenario, { width: w, height: h * 1.15 }]}>
      {/* Sombra en el piso: da peso y hace que el salto se lea */}
      <View style={[styles.sombra, { width: w * 0.5, backgroundColor: colors.border }]} />

      <AnimatedView style={[styles.zzz, estiloZzz]}>
        <Svg width={w * 0.3} height={w * 0.3} viewBox="0 0 40 40">
          <Path d="M6 8h14L6 24h16" stroke={colors.textMuted} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M24 2h10L24 14h11" stroke={colors.textMuted} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </Svg>
      </AnimatedView>

      <AnimatedView style={[styles.burbujas, estiloBurbujas]}>
        <Svg width={w * 0.55} height={w * 0.5} viewBox="0 0 60 60">
          <Circle cx="12" cy="42" r="7" fill={colors.primarySoft} opacity={0.9} />
          <Circle cx="32" cy="30" r="10" fill={colors.primarySoft} opacity={0.8} />
          <Circle cx="48" cy="44" r="6" fill={colors.primarySoft} opacity={0.85} />
          <Circle cx="24" cy="14" r="5" fill={colors.primarySoft} opacity={0.7} />
        </Svg>
      </AnimatedView>

      <AnimatedView style={estiloCuerpo}>
        <Svg width={w} height={h} viewBox="0 0 200 200">
          {/* Cola: se dibuja primero para que quede detrás del cuerpo */}
          <AnimatedView />
          <Ellipse cx="100" cy="132" rx="52" ry="42" fill={pelo} />
          <Ellipse cx="100" cy="146" rx="34" ry="26" fill={colors.primarySoft} />
          {/* Patas */}
          <Ellipse cx="72" cy="168" rx="15" ry="11" fill={peloOscuro} />
          <Ellipse cx="128" cy="168" rx="15" ry="11" fill={peloOscuro} />
        </Svg>

        {/* La cola va en su propio SVG para poder rotarla sola */}
        <AnimatedView style={[styles.cola, estiloCola]}>
          <Svg width={w * 0.3} height={w * 0.3} viewBox="0 0 60 60">
            {esGato ? (
              <Path
                d="M10 50 C 40 50, 52 30, 44 8"
                stroke={pelo}
                strokeWidth={11}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <Path d="M8 46 C 30 44, 44 30, 46 12" stroke={pelo} strokeWidth={13} fill="none" strokeLinecap="round" />
            )}
          </Svg>
        </AnimatedView>

        {/* Cabeza: baja al plato al comer */}
        <AnimatedView style={[styles.cabeza, estiloCabeza]}>
          <Svg width={w * 0.62} height={w * 0.62} viewBox="0 0 120 120">
            {/* Orejas: puntiagudas en gato, caídas en perro */}
            {esGato ? (
              <>
                <Path d="M22 34 L18 6 L46 24 Z" fill={pelo} />
                <Path d="M98 34 L102 6 L74 24 Z" fill={pelo} />
              </>
            ) : (
              <>
                <Ellipse cx="20" cy="44" rx="13" ry="26" fill={peloOscuro} />
                <Ellipse cx="100" cy="44" rx="13" ry="26" fill={peloOscuro} />
              </>
            )}

            <Circle cx="60" cy="60" r="42" fill={pelo} />
            <Ellipse cx="60" cy="76" rx="24" ry="18" fill={colors.primarySoft} />

            {/* Ojos: el scaleY del parpadeo los cierra */}
            <AnimatedView />
            <Circle cx="44" cy="52" r="6.5" fill="#1a1a1a" />
            <Circle cx="76" cy="52" r="6.5" fill="#1a1a1a" />
            <Circle cx="46" cy="49.5" r="2.2" fill="#fff" />
            <Circle cx="78" cy="49.5" r="2.2" fill="#fff" />

            {/* Hocico */}
            <Ellipse cx="60" cy="70" rx="8" ry="6" fill="#1a1a1a" />
            <Path
              d="M60 76 L60 82 M60 82 C 52 82, 50 90, 44 88 M60 82 C 68 82, 70 90, 76 88"
              stroke="#1a1a1a"
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
            />
            {esGato ? (
              <Path
                d="M30 68 L10 64 M30 74 L10 76 M90 68 L110 64 M90 74 L110 76"
                stroke="#1a1a1a"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            ) : null}
          </Svg>

          {/* Los párpados van encima, como dos tapas que bajan */}
          <AnimatedView style={[styles.parpados, estiloOjos]} pointerEvents="none">
            <Svg width={w * 0.62} height={w * 0.62} viewBox="0 0 120 120">
              <Circle cx="44" cy="52" r="0.1" fill={pelo} />
            </Svg>
          </AnimatedView>
        </AnimatedView>
      </AnimatedView>

      {/* Plato: aparece sólo al alimentar */}
      <AnimatedView style={[styles.plato, estiloPlato]}>
        <Svg width={w * 0.34} height={w * 0.2} viewBox="0 0 70 40">
          <Path d="M4 12 H66 L58 34 H12 Z" fill={colors.accent} />
          <Ellipse cx="35" cy="12" rx="31" ry="8" fill={colors.accentSoft} />
          <Circle cx="26" cy="12" r="4" fill={colors.text} opacity={0.5} />
          <Circle cx="38" cy="10" r="4.5" fill={colors.text} opacity={0.5} />
          <Circle cx="47" cy="13" r="3.5" fill={colors.text} opacity={0.5} />
        </Svg>
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  escenario: { alignItems: 'center', justifyContent: 'flex-end' },
  sombra: { position: 'absolute', bottom: 6, height: 10, borderRadius: 999, opacity: 0.5 },
  cabeza: { position: 'absolute', top: -6, alignSelf: 'center' },
  parpados: { position: 'absolute', top: 0, left: 0 },
  cola: { position: 'absolute', right: -6, top: '46%' },
  plato: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  burbujas: { position: 'absolute', bottom: '30%', alignSelf: 'center' },
  zzz: { position: 'absolute', top: 0, right: '18%' },
});
