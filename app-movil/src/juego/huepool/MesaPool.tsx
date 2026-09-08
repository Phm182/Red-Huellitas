import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Bola, Mesa, Vector } from './motor';

export type Posiciones = Record<number, Vector>;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Mismo helper que `CanchaSoccer.tsx::reproducir()`, sólo que acá las claves son números de bola. */
export function reproducir(
  trayectorias: Record<number, Vector[]>,
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
      pos[n] = { x: lerp(a.x, b.x, frac), y: lerp(a.y, b.y, frac) };
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

/** Cuánto se estira el arrastre antes de tirar: más lejos, más potencia. Misma idea que HueSoccer. */
const FACTOR_POTENCIA = 0.22;
const POTENCIA_MAXIMA = 16;

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

  const blanca = bolas.find((b) => b.n === 0);
  const posBlanca = blanca ? (posiciones[0] ?? { x: blanca.x, y: blanca.y }) : null;

  const gestoTiro = Gesture.Pan()
    .enabled(activo && !bolaEnMano)
    .onUpdate((e) => {
      runOnJS(setArrastre)({ dx: e.translationX, dy: e.translationY });
    })
    .onEnd((e) => {
      runOnJS(setArrastre)(null);
      const dist = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
      if (dist < 6) return;
      const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
      const impulso = { x: (-e.translationX / dist) * potencia, y: (-e.translationY / dist) * potencia };
      runOnJS(onTiro)(impulso);
    });

  const gestoColocar = Gesture.Tap()
    .enabled(activo && bolaEnMano)
    .onEnd((e) => {
      const x = Math.max(mesa.radioBola, Math.min(mesa.ancho - mesa.radioBola, e.x / escala));
      const y = Math.max(mesa.radioBola, Math.min(mesa.alto - mesa.radioBola, e.y / escala));
      runOnJS(onColocarBlanca)(x, y);
    });

  const troneras = [
    { x: 0, y: 0 }, { x: mesa.ancho / 2, y: 0 }, { x: mesa.ancho, y: 0 },
    { x: 0, y: mesa.alto }, { x: mesa.ancho / 2, y: mesa.alto }, { x: mesa.ancho, y: mesa.alto },
  ];

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
            const pos = posiciones[b.n] ?? { x: b.x, y: b.y };
            const diametro = px(mesa.radioBola) * 2;
            const color = b.n === 8 ? '#141414' : COLOR_BOLA[b.n] ?? '#999999';
            return (
              <View
                key={b.n}
                pointerEvents="none"
                style={[styles.bola, { width: diametro, height: diametro, left: px(pos.x) - diametro / 2, top: py(pos.y) - diametro / 2 }]}
              >
                <Svg width={diametro} height={diametro}>
                  <Circle cx={diametro / 2} cy={diametro / 2} r={diametro / 2 - 0.5} fill={esRayada(b.n) ? '#F4F1E6' : color} stroke="#00000040" strokeWidth={0.7} />
                  {esRayada(b.n) ? (
                    <Rect x={0} y={diametro * 0.32} width={diametro} height={diametro * 0.36} fill={color} />
                  ) : null}
                  <Circle cx={diametro / 2} cy={diametro / 2} r={diametro * 0.28} fill="#F4F1E6" />
                  <SvgText x={diametro / 2} y={diametro / 2 + diametro * 0.11} fontSize={diametro * 0.32} fill="#1A1A1A" textAnchor="middle" fontWeight="bold">
                    {b.n}
                  </SvgText>
                </Svg>
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
                  backgroundColor: '#F8F8F2',
                  borderWidth: 0.7,
                  borderColor: '#00000030',
                },
              ]}
            />
          </GestureDetector>
        ) : null}

        {arrastre && posBlanca ? (
          <FlechaTiro arrastre={arrastre} base={posBlanca} px={px} py={py} lado={lado} alto={alto} />
        ) : null}
      </View>
    </GestureDetector>
  );
}

function FlechaTiro({
  arrastre,
  base,
  px,
  py,
  lado,
  alto,
}: {
  arrastre: { dx: number; dy: number };
  base: Vector;
  px: (x: number) => number;
  py: (y: number) => number;
  lado: number;
  alto: number;
}) {
  const dist = Math.sqrt(arrastre.dx ** 2 + arrastre.dy ** 2);
  if (dist < 4) return null;

  const dirX = -arrastre.dx / dist;
  const dirY = -arrastre.dy / dist;
  const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
  const largo = 24 + (potencia / POTENCIA_MAXIMA) * 100;

  const cx = px(base.x);
  const cy = py(base.y);
  const puntaX = cx + dirX * largo;
  const puntaY = cy + dirY * largo;

  const angulo = Math.atan2(dirY, dirX);
  const alaLargo = 12;
  const alaAngulo = 0.5;
  const ala1X = puntaX - alaLargo * Math.cos(angulo - alaAngulo);
  const ala1Y = puntaY - alaLargo * Math.sin(angulo - alaAngulo);
  const ala2X = puntaX - alaLargo * Math.cos(angulo + alaAngulo);
  const ala2Y = puntaY - alaLargo * Math.sin(angulo + alaAngulo);

  const color = potencia >= POTENCIA_MAXIMA * 0.85 ? '#FF4136' : '#FFFFFF';

  return (
    <Svg width={lado} height={alto} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line x1={cx} y1={cy} x2={puntaX} y2={puntaY} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.95} />
      <Line x1={puntaX} y1={puntaY} x2={ala1X} y2={ala1Y} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.95} />
      <Line x1={puntaX} y1={puntaY} x2={ala2X} y2={ala2Y} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.95} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  mesa: { position: 'relative', alignSelf: 'center', borderRadius: 6, overflow: 'hidden' },
  bola: { position: 'absolute', borderRadius: 999 },
});
