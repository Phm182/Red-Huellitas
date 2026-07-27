import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { JuegoAnimo } from '../../types';
import { useTheme } from '../../theme/ThemeProvider';
import { pelajeDe } from './pelaje';

export type AccionViva = 'alimentar' | 'jugar' | 'banar' | 'dormir' | null;

type Props = {
  especie: string;
  /** Lo que el usuario escribió como raza; define el pelaje. */
  raza?: string | null;
  nombre: string;
  animo: JuegoAnimo;
  accion: AccionViva;
  /** Se incrementa desde afuera para re-disparar la misma acción. */
  disparo?: number;
  tamano?: number;
};

const AG = Animated.createAnimatedComponent(G);
const AEllipse = Animated.createAnimatedComponent(Ellipse);

/**
 * La mascota del juego, dibujada y animada por código.
 *
 * **Todo vive en un solo `<Svg>` de 300×300.** La versión anterior tenía la
 * cola en su propio SVG rotando sobre su propio pivote, y por eso se despegaba
 * del cuerpo. Acá cada parte es un `<G>` con su origen puesto en la
 * articulación real —la cola gira desde donde nace en el lomo, la cabeza desde
 * el cuello— así que al moverse siguen unidas.
 *
 * El color sale de la raza (ver `pelaje.ts`): un siamés se ve siamés.
 */
export function MascotaViva({
  especie,
  raza,
  nombre,
  animo,
  accion,
  disparo = 0,
  tamano = 230,
}: Props) {
  const { colors } = useTheme();
  const p = pelajeDe(especie, raza ?? null, nombre);
  const esGato = especie === 'gato';
  const durmiendo = accion === 'dormir';

  const respirar = useSharedValue(0);
  const colaAng = useSharedValue(0);
  const cabezaAng = useSharedValue(0);
  const cabezaY = useSharedValue(0);
  const mandibula = useSharedValue(0);
  const parpado = useSharedValue(0);
  const cuerpoY = useSharedValue(0);
  const cuerpoAng = useSharedValue(0);
  const orejaAng = useSharedValue(0);
  const burbujas = useSharedValue(0);
  const zzz = useSharedValue(0);
  const plato = useSharedValue(0);

  // --- Reposo ---
  useEffect(() => {
    const dur = durmiendo ? 2400 : animo === 'decaido' ? 2100 : animo === 'aburrido' ? 1700 : 1250;
    respirar.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // Decaída baja la cabeza; dormida la apoya del todo.
    cabezaAng.value = withTiming(durmiendo ? 16 : animo === 'decaido' ? 9 : 0, { duration: 600 });
    orejaAng.value = withTiming(durmiendo || animo === 'decaido' ? 16 : 0, { duration: 600 });
  }, [animo, durmiendo, respirar, cabezaAng, orejaAng]);

  useEffect(() => {
    if (durmiendo) {
      colaAng.value = withTiming(0, { duration: 500 });
      return;
    }
    const dur = animo === 'feliz' ? 240 : animo === 'bien' ? 400 : 820;
    const amp = animo === 'feliz' ? 26 : animo === 'bien' ? 16 : 8;
    colaAng.value = withRepeat(
      withSequence(
        withTiming(amp, { duration: dur, easing: Easing.inOut(Easing.quad) }),
        withTiming(-amp, { duration: dur, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [animo, durmiendo, colaAng]);

  useEffect(() => {
    if (durmiendo) {
      parpado.value = withTiming(1, { duration: 600 });
      return;
    }
    parpado.value = 0;
    const id = setInterval(() => {
      parpado.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 130 }));
    }, 3400);
    return () => clearInterval(id);
  }, [durmiendo, parpado]);

  // --- Actuaciones ---
  useEffect(() => {
    if (!accion) return;

    if (accion === 'alimentar') {
      plato.value = withSequence(
        withTiming(1, { duration: 260 }),
        withDelay(2400, withTiming(0, { duration: 320 }))
      );
      // Baja el cuello hasta el plato y mastica: la mandíbula abre y cierra.
      cabezaAng.value = withSequence(
        withTiming(30, { duration: 380, easing: Easing.out(Easing.cubic) }),
        withDelay(1500, withTiming(0, { duration: 420, easing: Easing.inOut(Easing.cubic) }))
      );
      cabezaY.value = withSequence(
        withTiming(26, { duration: 380, easing: Easing.out(Easing.cubic) }),
        withDelay(1500, withTiming(0, { duration: 420 }))
      );
      mandibula.value = withDelay(
        400,
        withRepeat(
          withSequence(withTiming(1, { duration: 130 }), withTiming(0, { duration: 130 })),
          6,
          false
        )
      );
    }

    if (accion === 'jugar') {
      cuerpoY.value = withSequence(
        withTiming(-44, { duration: 270, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 7, stiffness: 200 }),
        withTiming(-28, { duration: 230, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 8, stiffness: 210 })
      );
      cabezaAng.value = withSequence(
        withTiming(-14, { duration: 260 }),
        withSpring(0, { damping: 9 })
      );
    }

    if (accion === 'banar') {
      cuerpoAng.value = withSequence(
        withRepeat(
          withSequence(withTiming(-9, { duration: 85 }), withTiming(9, { duration: 85 })),
          7,
          true
        ),
        withSpring(0, { damping: 10 })
      );
      burbujas.value = withSequence(
        withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 300 })
      );
    }

    zzz.value = durmiendo
      ? withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false)
      : withTiming(0, { duration: 300 });
  }, [accion, disparo, durmiendo, cabezaAng, cabezaY, mandibula, cuerpoY, cuerpoAng, burbujas, zzz, plato]);

  // --- Props animadas: cada parte gira desde su articulación ---
  const propsCuerpo = useAnimatedProps(() => ({
    // El pecho se infla al respirar; el resto sigue quieto.
    scaleY: 1 + respirar.value * 0.035,
    originX: 150,
    originY: 210,
    rotation: cuerpoAng.value,
  })) as never;

  // La cola nace en (208, 176): ahí va el origen, por eso no se despega.
  const propsCola = useAnimatedProps(() => ({
    rotation: colaAng.value,
    originX: 208,
    originY: 176,
  })) as never;

  // El cuello está en (150, 150).
  const propsCabeza = useAnimatedProps(() => ({
    rotation: cabezaAng.value,
    originX: 150,
    originY: 150,
    translateY: cabezaY.value,
  })) as never;

  const propsOrejaIzq = useAnimatedProps(() => ({ rotation: -orejaAng.value, originX: 116, originY: 86 })) as never;
  const propsOrejaDer = useAnimatedProps(() => ({ rotation: orejaAng.value, originX: 184, originY: 86 })) as never;

  // Párpado: una elipse del color del pelaje que baja sobre el ojo.
  const propsParpIzq = useAnimatedProps(() => ({ ry: 1 + parpado.value * 10 })) as never;
  const propsParpDer = useAnimatedProps(() => ({ ry: 1 + parpado.value * 10 })) as never;

  // Mandíbula: el hocico se estira hacia abajo al masticar.
  const propsMandibula = useAnimatedProps(() => ({ ry: 7 + mandibula.value * 4 })) as never;

  const estiloEscena = useAnimatedStyle(() => ({ transform: [{ translateY: cuerpoY.value }] }));
  const estiloSombra = useAnimatedStyle(() => ({
    // La sombra se achica cuando salta: es lo que hace leer la altura.
    transform: [{ scaleX: 1 - Math.min(Math.abs(cuerpoY.value) / 120, 0.45) }],
    opacity: 0.45 - Math.min(Math.abs(cuerpoY.value) / 300, 0.25),
  }));
  const estiloBurbujas = useAnimatedStyle(() => ({
    opacity: burbujas.value > 0 ? 1 - burbujas.value * 0.55 : 0,
    transform: [{ translateY: -burbujas.value * tamano * 0.45 }, { scale: 0.7 + burbujas.value * 0.5 }],
  }));
  const estiloZzz = useAnimatedStyle(() => ({
    opacity: durmiendo ? Math.max(0, 1 - zzz.value) : 0,
    transform: [{ translateY: -zzz.value * tamano * 0.28 }, { translateX: zzz.value * tamano * 0.1 }],
  }));
  const estiloPlato = useAnimatedStyle(() => ({ opacity: plato.value }));

  return (
    <View style={[styles.escena, { width: tamano, height: tamano }]}>
      <Animated.View style={[styles.sombra, { width: tamano * 0.44, backgroundColor: '#000' }, estiloSombra]} />

      <Animated.View style={[styles.zzz, estiloZzz]} pointerEvents="none">
        <Svg width={tamano * 0.26} height={tamano * 0.26} viewBox="0 0 40 40">
          <Path d="M6 9h13L6 25h15" stroke={colors.textMuted} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M24 2h9L24 13h10" stroke={colors.textMuted} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.burbujas, estiloBurbujas]} pointerEvents="none">
        <Svg width={tamano * 0.62} height={tamano * 0.5} viewBox="0 0 80 64">
          <Circle cx="14" cy="46" r="9" fill="#BFE6F5" opacity={0.75} />
          <Circle cx="40" cy="30" r="13" fill="#D6F0FA" opacity={0.7} />
          <Circle cx="64" cy="48" r="8" fill="#BFE6F5" opacity={0.8} />
          <Circle cx="28" cy="12" r="6" fill="#EAF8FD" opacity={0.65} />
        </Svg>
      </Animated.View>

      <Animated.View style={estiloEscena}>
        <Svg width={tamano} height={tamano} viewBox="0 0 300 300">
          <Defs>
            {/* Volumen: el cuerpo se aclara arriba y se oscurece abajo */}
            <RadialGradient id="cuerpo" cx="42%" cy="30%" r="78%">
              <Stop offset="0" stopColor={p.claro} />
              <Stop offset="0.55" stopColor={p.base} />
              <Stop offset="1" stopColor={p.sombra} />
            </RadialGradient>
            <RadialGradient id="cara" cx="42%" cy="32%" r="76%">
              <Stop offset="0" stopColor={p.claro} />
              <Stop offset="0.6" stopColor={p.base} />
              <Stop offset="1" stopColor={p.sombra} />
            </RadialGradient>
            <LinearGradient id="brillo" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#fff" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* ---- COLA: se dibuja primero para quedar detrás del cuerpo ---- */}
          <AG animatedProps={propsCola}>
            {esGato ? (
              <Path
                d="M208 176 C 244 178, 262 150, 254 112"
                stroke={p.puntas ?? p.sombra}
                strokeWidth={17}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <Path
                d="M208 176 C 240 172, 254 150, 250 124"
                stroke={p.sombra}
                strokeWidth={21}
                fill="none"
                strokeLinecap="round"
              />
            )}
          </AG>

          {/* ---- CUERPO ---- */}
          <AG animatedProps={propsCuerpo}>
            {/* Patas traseras, detrás del torso */}
            <Ellipse cx="112" cy="238" rx="24" ry="17" fill={p.sombra} />
            <Ellipse cx="188" cy="238" rx="24" ry="17" fill={p.sombra} />

            <Ellipse cx="150" cy="196" rx="72" ry="60" fill="url(#cuerpo)" />
            {/* Pecho y panza claros */}
            <Ellipse cx="150" cy="214" rx="44" ry="36" fill={p.claro} opacity={0.85} />

            {p.patron === 'manchas' ? (
              <>
                <Ellipse cx="106" cy="176" rx="22" ry="18" fill={p.sombra} opacity={0.55} />
                <Ellipse cx="192" cy="216" rx="17" ry="14" fill={p.sombra} opacity={0.45} />
              </>
            ) : null}
            {p.patron === 'atigrado' ? (
              <>
                <Path d="M120 150 q 14 20 6 42" stroke={p.sombra} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.6} />
                <Path d="M150 144 q 12 22 4 46" stroke={p.sombra} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.6} />
                <Path d="M180 150 q 12 20 4 40" stroke={p.sombra} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.6} />
              </>
            ) : null}

            {/* Patas delanteras */}
            <Ellipse cx="122" cy="248" rx="21" ry="15" fill={p.puntas ?? p.base} />
            <Ellipse cx="178" cy="248" rx="21" ry="15" fill={p.puntas ?? p.base} />

            <Ellipse cx="128" cy="168" rx="40" ry="26" fill="url(#brillo)" />
          </AG>

          {/* ---- CABEZA: gira y baja desde el cuello (150,150) ---- */}
          <AG animatedProps={propsCabeza}>
            {/* Orejas detrás del cráneo */}
            <AG animatedProps={propsOrejaIzq}>
              {esGato ? (
                <Path d="M118 62 L104 20 L152 46 Z" fill={p.puntas ?? p.sombra} />
              ) : (
                <Ellipse cx="110" cy="92" rx="20" ry="38" fill={p.puntas ?? p.sombra} />
              )}
            </AG>
            <AG animatedProps={propsOrejaDer}>
              {esGato ? (
                <Path d="M182 62 L196 20 L148 46 Z" fill={p.puntas ?? p.sombra} />
              ) : (
                <Ellipse cx="190" cy="92" rx="20" ry="38" fill={p.puntas ?? p.sombra} />
              )}
            </AG>

            <Circle cx="150" cy="96" r="60" fill="url(#cara)" />

            {/* Máscara de puntas (siamés, husky) */}
            {p.patron === 'puntas' ? (
              <Ellipse cx="150" cy="118" rx="36" ry="28" fill={p.puntas ?? p.sombra} opacity={0.75} />
            ) : null}

            {/* Hocico claro */}
            <Ellipse cx="150" cy="118" rx="30" ry="23" fill={p.claro} opacity={p.patron === 'puntas' ? 0.55 : 0.95} />

            {/* Ojos: iris del color de la receta + brillo */}
            <Circle cx="128" cy="88" r="11" fill="#fff" />
            <Circle cx="172" cy="88" r="11" fill="#fff" />
            <Circle cx="129" cy="89" r="8" fill={p.ojos} />
            <Circle cx="173" cy="89" r="8" fill={p.ojos} />
            <Circle cx="129" cy="89" r={esGato ? 3.4 : 4.6} fill="#141414" />
            <Circle cx="173" cy="89" r={esGato ? 3.4 : 4.6} fill="#141414" />
            <Circle cx="132" cy="85" r="3" fill="#fff" />
            <Circle cx="176" cy="85" r="3" fill="#fff" />

            {/* Párpados: bajan al parpadear y quedan bajos al dormir */}
            <AEllipse animatedProps={propsParpIzq} cx="128" cy="82" rx="12" fill={p.base} />
            <AEllipse animatedProps={propsParpDer} cx="172" cy="82" rx="12" fill={p.base} />

            {/* Nariz y boca */}
            <AEllipse animatedProps={propsMandibula} cx="150" cy="110" rx="10" fill="#2A2A2E" />
            <Path
              d="M150 120 L150 128 M150 128 C 139 128, 136 139, 127 136 M150 128 C 161 128, 164 139, 173 136"
              stroke="#2A2A2E"
              strokeWidth={3.4}
              fill="none"
              strokeLinecap="round"
            />

            {esGato ? (
              <Path
                d="M116 108 L84 100 M116 116 L84 120 M184 108 L216 100 M184 116 L216 120"
                stroke="#2A2A2E"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.7}
              />
            ) : null}
          </AG>
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.plato, estiloPlato]} pointerEvents="none">
        <Svg width={tamano * 0.3} height={tamano * 0.17} viewBox="0 0 70 40">
          <Path d="M4 13 H66 L57 35 H13 Z" fill={colors.accent} />
          <Ellipse cx="35" cy="13" rx="31" ry="8.5" fill={colors.accentSoft} />
          <Circle cx="26" cy="12" r="4.5" fill="#8B5E2F" />
          <Circle cx="38" cy="10" r="5" fill="#A56C34" />
          <Circle cx="47" cy="13.5" r="4" fill="#8B5E2F" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  escena: { alignItems: 'center', justifyContent: 'center' },
  sombra: { position: 'absolute', bottom: 10, height: 12, borderRadius: 999, opacity: 0.4 },
  plato: { position: 'absolute', bottom: 4, alignSelf: 'center' },
  burbujas: { position: 'absolute', bottom: '26%', alignSelf: 'center' },
  zzz: { position: 'absolute', top: 2, right: '16%' },
});
