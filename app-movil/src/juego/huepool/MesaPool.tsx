import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import { BolaSkinSvg } from './BolaSkinSvg';
import { Bola, Mesa, PuntoTrayectoria, Vector } from './motor';
import { TacoBillar } from './TacoBillar';

export type PosicionBola = Vector & { angulo: number };
export type Posiciones = Record<number, PosicionBola>;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Mismo helper que `CanchaSoccer.tsx::reproducir()`, sólo que acá las claves son números de bola. */
export function reproducir(
  trayectorias: Record<number, PuntoTrayectoria[]>,
  duracionMs: number,
  onFrame: (pos: Posiciones) => void,
  onFin: () => void
): () => void {
  const inicio = Date.now();
  const ns = Object.keys(trayectorias).map(Number);
  let cancelado = false;

  function paso() {
    if (cancelado) return;
    const t = Math.min(1, (Date.now() - inicio) / duracionMs);
    const pos: Posiciones = {};
    for (const n of ns) {
      const arr = trayectorias[n]!;
      const posIdx = t * (arr.length - 1);
      const i0 = Math.floor(posIdx);
      const i1 = Math.min(arr.length - 1, i0 + 1);
      const frac = posIdx - i0;
      const a = arr[i0]!;
      const b = arr[i1]!;
      pos[n] = {
        x: lerp(a.pos.x, b.pos.x, frac),
        y: lerp(a.pos.y, b.pos.y, frac),
        angulo: lerp(a.angulo, b.angulo, frac),
      };
    }
    onFrame(pos);
    if (t < 1) {
      requestAnimationFrame(paso);
    } else {
      onFin();
    }
  }
  requestAnimationFrame(paso);

  return () => {
    cancelado = true;
  };
}

/** Colores reales de pool: 1-7 lisas, 9-15 rayadas (mismo color que su lisa −8). */
const COLOR_BOLA: Record<number, string> = {
  1: '#E8C93A', 2: '#2C6FE0', 3: '#E0342C', 4: '#7B3FE0', 5: '#E08A2C', 6: '#2CA85A', 7: '#8B4A2C',
  9: '#E8C93A', 10: '#2C6FE0', 11: '#E0342C', 12: '#7B3FE0', 13: '#E08A2C', 14: '#2CA85A', 15: '#8B4A2C',
};

function esRayada(n: number): boolean {
  return n >= 9 && n <= 15;
}

/** Tween chico a mano (mismo criterio que `reproducir()` de arriba: rAF +
 * lerp + callback por cuadro) para el golpe del taco — no hace falta
 * Reanimated acá: es una animación de ~100ms de UN número (`separacion`)
 * consumido directo por props de un componente SVG, no un estilo de
 * `Animated.View`; un `useSharedValue` leído en el cuerpo del render NO
 * dispara un re-render cuando cambia (`.value` no es estado de React), así
 * que ese camino se ve "congelado" hasta el próximo render por otra razón
 * — más simple resolverlo con estado común. */
function animarNumero(desde: number, hasta: number, duracionMs: number, onFrame: (v: number) => void, onFin: () => void) {
  const inicio = Date.now();
  function paso() {
    const t = Math.min(1, (Date.now() - inicio) / duracionMs);
    onFrame(desde + (hasta - desde) * t);
    if (t < 1) requestAnimationFrame(paso);
    else onFin();
  }
  requestAnimationFrame(paso);
}

/** Cuánto se estira el arrastre antes de tirar: más lejos, más potencia. Misma idea que HueSoccer. */
const FACTOR_POTENCIA = 0.22;
const POTENCIA_MAXIMA = 16;
/** Duración del golpe visual del taco (ver `onEnd` de `gestoTiro`) — el
 * impulso real recién se aplica cuando termina, para que la bola no arranque
 * a moverse mientras el taco todavía está a mitad de camino. */
const DURACION_GOLPE_MS = 110;
/** Cuánto se aleja la punta del taco de la bola por unidad de potencia cargada. */
const SEPARACION_BASE = 10;
const SEPARACION_MAXIMA = 100;

type Props = {
  mesa: Mesa;
  bolas: Bola[];
  posiciones: Posiciones;
  bolaEnMano: boolean;
  activo: boolean;
  lado: number;
  onTiro: (impulso: Vector) => void;
  onColocarBlanca: (x: number, y: number) => void;
};

/**
 * La mesa de HuePool y el gesto de tiro.
 *
 * Mismo "hondazo" que `CanchaSoccer.tsx` (arrastrar hacia atrás, sale para
 * el lado opuesto) pero con una sola bola arrastrable (la blanca) en vez de
 * una por jugador — en pool sólo se le pega directo a la blanca, nunca a
 * las demás.
 *
 * Con bola en mano (falta del rival), un toque en cualquier parte vacía de
 * la mesa reubica la blanca ahí antes de poder tirar.
 */
export function MesaPool({ mesa, bolas, posiciones, bolaEnMano, activo, lado, onTiro, onColocarBlanca }: Props) {
  const escala = lado / mesa.ancho;
  const alto = mesa.alto * escala;
  const px = (x: number) => x * escala;
  const py = (y: number) => y * escala;

  const [arrastre, setArrastre] = useState<{ dx: number; dy: number } | null>(null);
  // `null` = mostrar la separación calculada en vivo desde `arrastre`
  // (cargando el tiro); un número = el golpe ya está animando hacia la
  // bola, ese valor manda. `arrastre` se mantiene con su ÚLTIMO valor
  // durante todo el golpe (no se limpia hasta que termina) para no perder
  // la dirección del taco a mitad de la animación.
  const [separacionOverride, setSeparacionOverride] = useState<number | null>(null);

  const blanca = bolas.find((b) => b.n === 0);
  const posBlanca = blanca ? (posiciones[0] ?? { x: blanca.x, y: blanca.y, angulo: 0 }) : null;

  const iniciarGolpe = (separacionInicial: number, impulso: Vector) => {
    setSeparacionOverride(separacionInicial);
    animarNumero(separacionInicial, 0, DURACION_GOLPE_MS, setSeparacionOverride, () => {
      // El impulso real recién se aplica ACÁ, cuando el taco ya "llegó" a
      // la bola — si se llamara a `onTiro` de inmediato en `onEnd`, la
      // bola saldría disparada mientras el taco todavía está animando el
      // golpe (confirmado en `huepool.tsx`: `onTiro` apaga `activo` de
      // forma síncrona).
      setSeparacionOverride(null);
      setArrastre(null);
      onTiro(impulso);
    });
  };

  const gestoTiro = Gesture.Pan()
    .enabled(activo && !bolaEnMano)
    .onUpdate((e) => {
      runOnJS(setArrastre)({ dx: e.translationX, dy: e.translationY });
    })
    .onEnd((e) => {
      const dist = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
      if (dist < 6) {
        runOnJS(setArrastre)(null);
        return;
      }
      const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
      const impulso = { x: (-e.translationX / dist) * potencia, y: (-e.translationY / dist) * potencia };
      const separacionInicial = SEPARACION_BASE + (potencia / POTENCIA_MAXIMA) * SEPARACION_MAXIMA;
      runOnJS(iniciarGolpe)(separacionInicial, impulso);
    });

  const gestoColocar = Gesture.Tap()
    .enabled(activo && bolaEnMano)
    .onEnd((e) => {
      const x = Math.max(mesa.radioBola, Math.min(mesa.ancho - mesa.radioBola, e.x / escala));
      const y = Math.max(mesa.radioBola, Math.min(mesa.alto - mesa.radioBola, e.y / escala));
      runOnJS(onColocarBlanca)(x, y);
    });

  // 4 esquinas + los 2 medios de banda LARGA (izquierda/derecha — la mesa es
  // más alta que ancha) — mismo layout que `motor.ts::troneras()`, tienen
  // que coincidir sí o sí (acá es sólo dibujo, la física vive en el motor).
  const troneras = [
    { x: 0, y: 0 }, { x: mesa.ancho, y: 0 },
    { x: 0, y: mesa.alto / 2 }, { x: mesa.ancho, y: mesa.alto / 2 },
    { x: 0, y: mesa.alto }, { x: mesa.ancho, y: mesa.alto },
  ];

  // Dirección de tiro + separación del taco, derivadas del arrastre en
  // curso — mismo cálculo que ya hacía `FlechaTiro`, ahora alimenta al
  // taco. Durante el golpe (`separacionOverride` no nulo) `arrastre` sigue
  // con su último valor (recién se limpia al terminar la animación), así
  // que la dirección no salta — sólo la separación, que la pisa el tween.
  let direccionTiro: Vector | null = null;
  let separacionTiro = 0;
  if (arrastre) {
    const dist = Math.sqrt(arrastre.dx ** 2 + arrastre.dy ** 2);
    if (dist >= 4) {
      direccionTiro = { x: -arrastre.dx / dist, y: -arrastre.dy / dist };
      if (separacionOverride !== null) {
        separacionTiro = separacionOverride;
      } else {
        const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
        separacionTiro = SEPARACION_BASE + (potencia / POTENCIA_MAXIMA) * SEPARACION_MAXIMA;
      }
    }
  }

  return (
    <GestureDetector gesture={gestoColocar}>
      <View style={[styles.mesa, { width: lado, height: alto, backgroundColor: '#1F6B3A' }]}>
        <Svg width={lado} height={alto} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={lado} height={alto} fill="none" stroke="#6B4226" strokeWidth={px(mesa.radioBola)} />
          {troneras.map((t, i) => (
            <Circle key={i} cx={px(t.x)} cy={py(t.y)} r={px(mesa.radioTronera)} fill="#0A0A0A" />
          ))}
        </Svg>

        {bolas
          .filter((b) => b.n !== 0)
          .map((b) => {
            const pos = posiciones[b.n] ?? { x: b.x, y: b.y, angulo: 0 };
            const diametro = px(mesa.radioBola) * 2;
            const color = b.n === 8 ? '#141414' : COLOR_BOLA[b.n] ?? '#999999';
            return (
              <View
                key={b.n}
                pointerEvents="none"
                style={[
                  styles.bola,
                  {
                    width: diametro,
                    height: diametro,
                    left: px(pos.x) - diametro / 2,
                    top: py(pos.y) - diametro / 2,
                    transform: [{ rotate: `${((pos.angulo * 180) / Math.PI) % 360}deg` }],
                  },
                ]}
              >
                <BolaSkinSvg numero={b.n} esRayada={esRayada(b.n)} color={color} size={diametro} idInstancia={b.n} />
              </View>
            );
          })}

        {posBlanca ? (
          <GestureDetector gesture={gestoTiro}>
            <View
              style={[
                styles.bola,
                {
                  width: px(mesa.radioBola) * 2,
                  height: px(mesa.radioBola) * 2,
                  left: px(posBlanca.x) - px(mesa.radioBola),
                  top: py(posBlanca.y) - px(mesa.radioBola),
                  transform: [{ rotate: `${((posBlanca.angulo * 180) / Math.PI) % 360}deg` }],
                },
              ]}
            >
              <BolaSkinSvg numero={0} esRayada={false} color="#F8F8F2" esBlanca size={px(mesa.radioBola) * 2} idInstancia={0} />
            </View>
          </GestureDetector>
        ) : null}

        {direccionTiro && posBlanca ? (
          <TacoBillar
            direccion={direccionTiro}
            separacion={separacionTiro}
            base={posBlanca}
            px={px}
            py={py}
            lado={lado}
            alto={alto}
          />
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  mesa: { position: 'relative', alignSelf: 'center', borderRadius: 6, overflow: 'hidden' },
  bola: { position: 'absolute', borderRadius: 999 },
});
