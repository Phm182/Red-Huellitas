import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { BolaSkinSvg } from './BolaSkinSvg';
import { Bola, Mesa, PuntoTrayectoria, Vector } from './motor';
import { TacoBillar } from './TacoBillar';

/** Posición interpolada de una bola en un instante: centro (x,y), rodadura
 * acumulada `rod` y la dirección de avance `dir` en ese tramo — con esos
 * tres `BolaSkinSvg` "hace rodar" el número/franja sobre la cara. */
export type PosicionBola = Vector & { rod: number; dirX: number; dirY: number };
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
  const ultimaDir: Record<number, { x: number; y: number }> = {};
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
      // Dirección de rodadura = hacia dónde se mueve la bola en este tramo.
      // Si el tramo es casi nulo (bola quieta) se mantiene la última.
      const ddx = b.pos.x - a.pos.x;
      const ddy = b.pos.y - a.pos.y;
      const dm = Math.hypot(ddx, ddy);
      if (dm > 0.01) ultimaDir[n] = { x: ddx / dm, y: ddy / dm };
      const dir = ultimaDir[n] ?? { x: 1, y: 0 };
      pos[n] = {
        x: lerp(a.pos.x, b.pos.x, frac),
        y: lerp(a.pos.y, b.pos.y, frac),
        rod: lerp(a.rod, b.rod, frac),
        dirX: dir.x,
        dirY: dir.y,
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

/** Grosor del marco de madera (px de pantalla). */
const MARCO = 16;
/** Las 6 troneras en coordenadas RELATIVAS (0..1) de la mesa — 4 esquinas +
 * 2 medios de banda larga. Debe coincidir con `motor.ts::troneras()`. */
const TRONERAS_REL = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

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
  const posBlanca = blanca
    ? (posiciones[0] ?? { x: blanca.x, y: blanca.y, rod: 0, dirX: 0, dirY: 0 })
    : null;

  // Última posición conocida de cada bola en mesa — para animar el "hundido"
  // en la tronera cuando desaparece de `bolas` (ver `hundiendo`).
  const ultimaPosRef = useRef<Record<number, Vector>>({});
  const bolasPrevRef = useRef<number[]>([]);
  const [hundiendo, setHundiendo] = useState<{ n: number; x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    for (const b of bolas) {
      const p = posiciones[b.n];
      if (p) ultimaPosRef.current[b.n] = { x: p.x, y: p.y };
    }
    const ahora = bolas.map((b) => b.n);
    const idxTron = (v: Vector) => {
      for (const t of TRONERAS_REL) {
        const tx = t.x * mesa.ancho;
        const ty = t.y * mesa.alto;
        if (Math.hypot(v.x - tx, v.y - ty) <= mesa.radioTronera * 2.4) return { x: tx, y: ty };
      }
      return null;
    };
    for (const n of bolasPrevRef.current) {
      if (ahora.includes(n)) continue;
      const last = ultimaPosRef.current[n];
      const cerca = last ? idxTron(last) : null;
      if (cerca) {
        const id = Date.now() + n;
        setHundiendo((h) => [...h, { n, x: cerca.x, y: cerca.y, id }]);
        setTimeout(() => setHundiendo((h) => h.filter((x) => x.id !== id)), 260);
      }
    }
    bolasPrevRef.current = ahora;
  }, [bolas, posiciones, mesa.ancho, mesa.alto, mesa.radioTronera]);

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

  const troneras = TRONERAS_REL.map((t) => ({ x: t.x * mesa.ancho, y: t.y * mesa.alto }));

  // Dirección de tiro + separación del taco + potencia (0..1), derivadas del
  // arrastre en curso — mismo cálculo que ya hacía `FlechaTiro`, ahora
  // alimenta al taco Y a la línea de apuntado. Durante el golpe
  // (`separacionOverride` no nulo) `arrastre` sigue con su último valor
  // (recién se limpia al terminar la animación), así que la dirección no
  // salta — sólo la separación, que la pisa el tween.
  let direccionTiro: Vector | null = null;
  let separacionTiro = 0;
  let potenciaFrac = 0;
  if (arrastre) {
    const dist = Math.sqrt(arrastre.dx ** 2 + arrastre.dy ** 2);
    if (dist >= 4) {
      direccionTiro = { x: -arrastre.dx / dist, y: -arrastre.dy / dist };
      const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
      potenciaFrac = potencia / POTENCIA_MAXIMA;
      separacionTiro =
        separacionOverride !== null
          ? separacionOverride
          : SEPARACION_BASE + potenciaFrac * SEPARACION_MAXIMA;
    }
  }
  // La línea sólo mientras se carga el tiro, no durante el golpe animado.
  const mostrarLinea = direccionTiro !== null && separacionOverride === null && !bolaEnMano;

  const diametro = px(mesa.radioBola) * 2;

  return (
    <View style={[styles.marco, { width: lado + MARCO * 2, height: alto + MARCO * 2 }]}>
      {/* Bisel interior del marco (madera un poco más clara mordida por la
          "banda"), decorativo. */}
      <View style={[styles.bisel, { width: lado + 8, height: alto + 8, top: MARCO - 4, left: MARCO - 4 }]} />

      <GestureDetector gesture={gestoColocar}>
        <View style={[styles.felt, { width: lado, height: alto, top: MARCO, left: MARCO }]}>
          <Svg width={lado} height={alto} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Troneras: boca oscura en cada esquina y en los medios de banda
                larga. Se dibujan bajo las bolas para que una bola que pasa
                cerca se siga viendo; al embocar, `BolaHundiendo` la hunde. */}
            {troneras.map((tr, i) => (
              <Circle key={i} cx={px(tr.x)} cy={py(tr.y)} r={px(mesa.radioTronera)} fill="#0A0A0A" />
            ))}
            {/* Línea de apuntado: desde la blanca hacia donde sale, más larga
                cuanto más fuerte el tiro. Igual que la flecha de HueSoccer. */}
            {mostrarLinea && direccionTiro && posBlanca
              ? (() => {
                  const largo = 26 + potenciaFrac * 150;
                  const x1 = px(posBlanca.x);
                  const y1 = py(posBlanca.y);
                  return (
                    <Line
                      x1={x1}
                      y1={y1}
                      x2={x1 + direccionTiro.x * largo}
                      y2={y1 + direccionTiro.y * largo}
                      stroke={potenciaFrac >= 0.85 ? '#FF4136' : '#FFFFFF'}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                  );
                })()
              : null}
          </Svg>

          {bolas
            .filter((b) => b.n !== 0)
            .map((b) => {
              const pos = posiciones[b.n] ?? { x: b.x, y: b.y, rod: 0, dirX: 0, dirY: 0 };
              const color = b.n === 8 ? '#141414' : COLOR_BOLA[b.n] ?? '#999999';
              return (
                <View
                  key={b.n}
                  pointerEvents="none"
                  style={[
                    styles.bola,
                    { width: diametro, height: diametro, left: px(pos.x) - diametro / 2, top: py(pos.y) - diametro / 2 },
                  ]}
                >
                  <BolaSkinSvg
                    numero={b.n}
                    esRayada={esRayada(b.n)}
                    color={color}
                    size={diametro}
                    idInstancia={b.n}
                    rod={pos.rod}
                    dirX={pos.dirX}
                    dirY={pos.dirY}
                  />
                </View>
              );
            })}

          {posBlanca ? (
            <GestureDetector gesture={gestoTiro}>
              <View
                style={[
                  styles.bola,
                  {
                    width: diametro,
                    height: diametro,
                    left: px(posBlanca.x) - diametro / 2,
                    top: py(posBlanca.y) - diametro / 2,
                  },
                ]}
              >
                <BolaSkinSvg
                  numero={0}
                  esRayada={false}
                  color="#F8F8F2"
                  esBlanca
                  size={diametro}
                  idInstancia={0}
                  rod={posBlanca.rod}
                  dirX={posBlanca.dirX}
                  dirY={posBlanca.dirY}
                />
              </View>
            </GestureDetector>
          ) : null}

          {hundiendo.map((h) => (
            <BolaHundiendo
              key={h.id}
              cx={px(h.x)}
              cy={py(h.y)}
              diametro={diametro}
              numero={h.n}
              esRayada={esRayada(h.n)}
              color={h.n === 8 ? '#141414' : COLOR_BOLA[h.n] ?? '#999999'}
              esBlanca={h.n === 0}
            />
          ))}

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
    </View>
  );
}

/** La bola que acaba de embocar: se achica y se apaga hundiéndose en la
 * tronera (~230ms) antes de desaparecer del render. Micro-animación
 * puntual disparada a mano — no rompe la regla de nada de `entering`/
 * `exiting` declarativos de Reanimated. */
function BolaHundiendo({
  cx,
  cy,
  diametro,
  numero,
  esRayada,
  color,
  esBlanca,
}: {
  cx: number;
  cy: number;
  diametro: number;
  numero: number;
  esRayada: boolean;
  color: string;
  esBlanca: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 230 });
  }, [t]);
  const estilo = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 1 - 0.85 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bola,
        { width: diametro, height: diametro, left: cx - diametro / 2, top: cy - diametro / 2 },
        estilo,
      ]}
    >
      <BolaSkinSvg numero={numero} esRayada={esRayada} color={color} esBlanca={esBlanca} size={diametro} idInstancia={numero} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Marco de madera: contenedor exterior. El paño va absoluto adentro.
  marco: {
    position: 'relative',
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#5A3620',
    borderWidth: 2,
    borderColor: '#3E2415',
  },
  bisel: { position: 'absolute', borderRadius: 8, backgroundColor: '#7A4A2C' },
  felt: { position: 'absolute', borderRadius: 6, backgroundColor: '#1F6B3A', overflow: 'hidden' },
  bola: { position: 'absolute', borderRadius: 999 },
});
