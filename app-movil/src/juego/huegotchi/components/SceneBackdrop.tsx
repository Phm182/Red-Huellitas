import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { PlaceId } from '../domain/types';

type Props = {
  place: PlaceId;
  isNight: boolean;
  isRaining: boolean;
  size: number;
  /** Segundos acumulados: mueve lluvia, nubes y hojas. */
  clock: number;
};

/** El personaje apoya las patas en y=150 del mismo viewBox 200x200. */
const HORIZON = 150;

type Paleta = {
  cieloTop: string;
  cieloBottom: string;
  pisoTop: string;
  pisoBottom: string;
  acento: string;
  acentoOscuro: string;
};

const PALETAS: Record<PlaceId, Paleta> = {
  living: {
    cieloTop: '#F6E9D8', cieloBottom: '#E7D2B6',
    pisoTop: '#C69B6D', pisoBottom: '#9C7048',
    acento: '#B5714E', acentoOscuro: '#7C4A30',
  },
  cocina: {
    cieloTop: '#EFF6F2', cieloBottom: '#D4E6DC',
    pisoTop: '#BFCBC3', pisoBottom: '#94A29A',
    acento: '#6E9C86', acentoOscuro: '#456352',
  },
  patio: {
    cieloTop: '#8ECBF0', cieloBottom: '#D3EBF7',
    pisoTop: '#8CC96F', pisoBottom: '#5B9448',
    acento: '#3F7A34', acentoOscuro: '#2A5324',
  },
  arbol: {
    cieloTop: '#A8DCC4', cieloBottom: '#D8EED9',
    pisoTop: '#7FAE68', pisoBottom: '#4F7A43',
    acento: '#3B6B3F', acentoOscuro: '#27492B',
  },
  plaza: {
    cieloTop: '#9AD3F2', cieloBottom: '#E4E9C9',
    pisoTop: '#D9C489', pisoBottom: '#B0934F',
    acento: '#8A9B5A', acentoOscuro: '#5C6B3A',
  },
};

/**
 * Escenario de fondo: cielo/pared, piso con perspectiva, y mobiliario propio
 * de cada lugar. Tiene que leerse de un vistazo dónde está el animal, así que
 * el personaje ocupa poco más de la mitad del cuadro y esto se ve alrededor.
 */
export function SceneBackdrop({ place, isNight, isRaining, size, clock }: Props) {
  const p = PALETAS[place];

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="bgCielo" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={p.cieloTop} />
            <Stop offset="100%" stopColor={p.cieloBottom} />
          </LinearGradient>
          <LinearGradient id="bgPiso" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={p.pisoTop} />
            <Stop offset="100%" stopColor={p.pisoBottom} />
          </LinearGradient>
          <LinearGradient id="bgNoche" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0B1030" stopOpacity="0.62" />
            <Stop offset="100%" stopColor="#131A3C" stopOpacity="0.34" />
          </LinearGradient>
          <LinearGradient id="bgVineta" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.16" />
            <Stop offset="45%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </LinearGradient>
        </Defs>

        {/* Cielo o pared */}
        <Rect x={0} y={0} width={200} height={HORIZON} fill="url(#bgCielo)" />
        {/* Piso */}
        <Rect x={0} y={HORIZON} width={200} height={200 - HORIZON} fill="url(#bgPiso)" />
        {/* Zócalo / línea de horizonte, que es lo que da la sensación de piso */}
        <Rect x={0} y={HORIZON - 2} width={200} height={4} fill={p.acentoOscuro} opacity={0.35} />

        {escena(place, p, clock, isNight)}

        {/* Luz cálida desde arriba para que el personaje no quede recortado */}
        <Ellipse cx={100} cy={HORIZON - 10} rx={80} ry={40} fill="#FFF3D0" opacity={isNight ? 0.06 : 0.16} />

        {isNight ? <Rect x={0} y={0} width={200} height={200} fill="url(#bgNoche)" /> : null}
        {isNight ? estrellas() : null}
        {isRaining ? lluvia(clock) : null}
        <Rect x={0} y={0} width={200} height={200} fill="url(#bgVineta)" />
      </Svg>
    </View>
  );
}

function escena(place: PlaceId, p: Paleta, clock: number, isNight: boolean) {
  switch (place) {
    case 'living':
      return (
        <G>
          {/* Pared: moldura y cuadros */}
          <Rect x={0} y={HORIZON - 34} width={200} height={5} fill={p.acentoOscuro} opacity={0.22} />
          <Rect x={18} y={34} width={34} height={26} rx={2} fill={p.acentoOscuro} opacity={0.5} />
          <Rect x={22} y={38} width={26} height={18} rx={1} fill="#E8CFA8" opacity={0.8} />
          <Rect x={60} y={40} width={22} height={18} rx={2} fill={p.acentoOscuro} opacity={0.4} />
          {/* Ventana con marco */}
          <Rect x={128} y={28} width={54} height={46} rx={3} fill={isNight ? '#1B2450' : '#BFE0F2'} />
          <Rect x={128} y={28} width={54} height={46} rx={3} fill="none" stroke={p.acentoOscuro} strokeWidth={3} opacity={0.6} />
          <Path d={`M155 28 L155 74 M128 51 L182 51`} stroke={p.acentoOscuro} strokeWidth={2} opacity={0.5} />
          {isNight ? <Circle cx={168} cy={40} r={6} fill="#F2EEC9" opacity={0.85} /> : null}
          {/* Sillón a la izquierda */}
          <Rect x={2} y={HORIZON - 30} width={46} height={32} rx={6} fill={p.acento} />
          <Rect x={6} y={HORIZON - 24} width={38} height={18} rx={5} fill={shade(p.acento, 26)} />
          <Rect x={0} y={HORIZON - 34} width={12} height={38} rx={5} fill={shade(p.acento, -16)} />
          {/* Lámpara de pie a la derecha */}
          <Rect x={176} y={HORIZON - 44} width={3} height={44} fill={p.acentoOscuro} opacity={0.75} />
          <Path d={`M166 ${HORIZON - 44} L189 ${HORIZON - 44} L184 ${HORIZON - 58} L171 ${HORIZON - 58} Z`} fill={isNight ? '#FFE9A8' : '#E4D3AE'} />
          {isNight ? <Ellipse cx={177} cy={HORIZON - 34} rx={26} ry={22} fill="#FFE9A8" opacity={0.16} /> : null}
          {/* Alfombra bajo el animal */}
          <Ellipse cx={100} cy={HORIZON + 22} rx={72} ry={20} fill={p.acento} opacity={0.45} />
          <Ellipse cx={100} cy={HORIZON + 22} rx={56} ry={14} fill={shade(p.acento, 30)} opacity={0.4} />
        </G>
      );

    case 'cocina':
      return (
        <G>
          {/* Azulejos */}
          {Array.from({ length: 9 }, (_, cx) =>
            Array.from({ length: 5 }, (_, cy) => (
              <Rect
                key={`${cx}-${cy}`}
                x={cx * 23 + 1}
                y={cy * 22 + 8}
                width={21}
                height={20}
                rx={2}
                fill="#FFFFFF"
                opacity={(cx + cy) % 2 === 0 ? 0.34 : 0.14}
              />
            ))
          )}
          {/* Mesada + alacena a la derecha */}
          <Rect x={120} y={HORIZON - 42} width={80} height={8} rx={2} fill={shade(p.acentoOscuro, 40)} />
          <Rect x={124} y={HORIZON - 34} width={72} height={34} rx={3} fill={p.acento} />
          <Path d={`M160 ${HORIZON - 34} L160 ${HORIZON}`} stroke={p.acentoOscuro} strokeWidth={2} opacity={0.6} />
          <Circle cx={152} cy={HORIZON - 20} r={2} fill="#F4F1E6" />
          <Circle cx={168} cy={HORIZON - 20} r={2} fill="#F4F1E6" />
          {/* Olla */}
          <Rect x={132} y={HORIZON - 52} width={22} height={11} rx={2} fill="#8D98A2" />
          <Rect x={129} y={HORIZON - 54} width={28} height={3} rx={1.5} fill="#AEB8C2" />
          {/* Heladera a la izquierda */}
          <Rect x={2} y={HORIZON - 78} width={40} height={78} rx={4} fill="#E4E9EA" />
          <Path d={`M2 ${HORIZON - 44} L42 ${HORIZON - 44}`} stroke="#B9C2C4" strokeWidth={2} />
          <Rect x={35} y={HORIZON - 68} width={3} height={14} rx={1.5} fill="#9AA4A6" />
          <Rect x={35} y={HORIZON - 38} width={3} height={14} rx={1.5} fill="#9AA4A6" />
          {/* Baldosas del piso */}
          {Array.from({ length: 5 }, (_, i) => (
            <Path key={i} d={`M${i * 50 - 20} 200 L${i * 50 + 24} ${HORIZON}`} stroke="#FFFFFF" strokeWidth={1} opacity={0.16} />
          ))}
        </G>
      );

    case 'patio':
      return (
        <G>
          {isNight ? (
            <Circle cx={158} cy={34} r={15} fill="#F4F0D8" opacity={0.9} />
          ) : (
            <>
              <Circle cx={158} cy={32} r={16} fill="#FFE9A0" opacity={0.95} />
              <Circle cx={158} cy={32} r={24} fill="#FFE9A0" opacity={0.2} />
            </>
          )}
          {/* Nubes que se desplazan lento */}
          {[0, 1].map((i) => {
            const x = ((clock * 3 + i * 110) % 260) - 40;
            return (
              <G key={i} opacity={0.85}>
                <Ellipse cx={x} cy={30 + i * 16} rx={20} ry={9} fill="#FFFFFF" />
                <Ellipse cx={x + 14} cy={32 + i * 16} rx={14} ry={7} fill="#FFFFFF" />
                <Ellipse cx={x - 13} cy={33 + i * 16} rx={12} ry={6} fill="#FFFFFF" />
              </G>
            );
          })}
          {/* Cerco de madera */}
          <Rect x={0} y={HORIZON - 34} width={200} height={4} fill={p.acentoOscuro} opacity={0.8} />
          <Rect x={0} y={HORIZON - 22} width={200} height={4} fill={p.acentoOscuro} opacity={0.8} />
          {Array.from({ length: 13 }, (_, i) => (
            <Path
              key={i}
              d={`M${i * 16 + 3} ${HORIZON} L${i * 16 + 3} ${HORIZON - 40} L${i * 16 + 8} ${HORIZON - 45} L${i * 16 + 13} ${HORIZON - 40} L${i * 16 + 13} ${HORIZON}`}
              fill="#B98E5E"
              stroke={p.acentoOscuro}
              strokeWidth={0.6}
            />
          ))}
          {/* Casita de perro */}
          <Rect x={4} y={HORIZON - 26} width={40} height={26} rx={2} fill="#C0724A" />
          <Path d={`M0 ${HORIZON - 26} L24 ${HORIZON - 44} L48 ${HORIZON - 26} Z`} fill="#8F4C2E" />
          <Ellipse cx={24} cy={HORIZON - 6} rx={11} ry={14} fill="#4A2A1C" />
          {/* Pasto en primer plano */}
          {Array.from({ length: 26 }, (_, i) => {
            const x = i * 8 + ((i % 3) * 2);
            const h = 6 + (i % 4) * 3;
            return (
              <Path
                key={i}
                d={`M${x} 200 Q${x + 2} ${200 - h}, ${x + 5} ${200 - h - 2}`}
                stroke={p.acento}
                strokeWidth={2}
                fill="none"
                opacity={0.75}
              />
            );
          })}
          {/* Flores */}
          {[62, 148, 176].map((x, i) => (
            <G key={i}>
              <Path d={`M${x} ${HORIZON + 16} L${x} ${HORIZON + 6}`} stroke={p.acento} strokeWidth={1.5} />
              <Circle cx={x} cy={HORIZON + 4} r={3.4} fill={i === 1 ? '#F2C14E' : '#E87D9B'} />
              <Circle cx={x} cy={HORIZON + 4} r={1.2} fill="#FFF6D8" />
            </G>
          ))}
        </G>
      );

    case 'arbol':
      return (
        <G>
          {/* Copa que entra desde arriba */}
          <Circle cx={140} cy={16} r={54} fill={p.acento} opacity={0.9} />
          <Circle cx={92} cy={2} r={44} fill={shade(p.acento, 18)} opacity={0.85} />
          <Circle cx={176} cy={30} r={32} fill={shade(p.acento, -12)} opacity={0.8} />
          {/* Tronco */}
          <Path
            d={`M148 ${HORIZON} C142 ${HORIZON - 40}, 152 ${HORIZON - 70}, 146 60 L166 60 C162 ${HORIZON - 72}, 172 ${HORIZON - 38}, 176 ${HORIZON} Z`}
            fill="#7A5334"
          />
          <Path d={`M156 ${HORIZON - 10} L156 74`} stroke="#5E3E26" strokeWidth={2} opacity={0.6} />
          {/* Raíces */}
          <Path d={`M148 ${HORIZON} Q136 ${HORIZON + 6}, 126 ${HORIZON + 5}`} stroke="#6B472C" strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d={`M176 ${HORIZON} Q188 ${HORIZON + 7}, 198 ${HORIZON + 4}`} stroke="#6B472C" strokeWidth={5} fill="none" strokeLinecap="round" />
          {/* Árboles del fondo */}
          {[18, 46, 74].map((x, i) => (
            <G key={i} opacity={0.35}>
              <Rect x={x} y={HORIZON - 26} width={5} height={26} fill="#4A3A26" />
              <Circle cx={x + 2.5} cy={HORIZON - 34} r={15} fill={p.acentoOscuro} />
            </G>
          ))}
          {/* Hojas que caen */}
          {Array.from({ length: 6 }, (_, i) => {
            const f = ((clock * 0.28 + i * 0.17) % 1);
            const x = 40 + i * 26 + Math.sin(f * 7 + i) * 12;
            return (
              <Ellipse
                key={i}
                cx={x}
                cy={20 + f * (HORIZON + 20)}
                rx={3.6}
                ry={2.2}
                fill={i % 2 ? '#D9A046' : shade(p.acento, 30)}
                opacity={0.85}
                transform={`rotate(${f * 300} ${x} ${20 + f * (HORIZON + 20)})`}
              />
            );
          })}
          {/* Pasto */}
          {Array.from({ length: 22 }, (_, i) => (
            <Path
              key={i}
              d={`M${i * 9.5} 200 Q${i * 9.5 + 2} ${192 - (i % 3) * 3}, ${i * 9.5 + 5} ${190 - (i % 3) * 3}`}
              stroke={p.acento}
              strokeWidth={2}
              fill="none"
              opacity={0.7}
            />
          ))}
        </G>
      );

    case 'plaza':
    default:
      return (
        <G>
          {/* Edificios lejanos */}
          {[[4, 40], [26, 56], [50, 34], [150, 48], [176, 30]].map(([x, h], i) => (
            <G key={i} opacity={0.3}>
              <Rect x={x} y={HORIZON - h} width={20} height={h} fill={p.acentoOscuro} />
              {Array.from({ length: 3 }, (_, w) => (
                <Rect
                  key={w}
                  x={(x as number) + 4}
                  y={HORIZON - (h as number) + 6 + w * 10}
                  width={12}
                  height={5}
                  fill={isNight ? '#FFE9A0' : '#FFFFFF'}
                  opacity={isNight ? 0.8 : 0.4}
                />
              ))}
            </G>
          ))}
          {/* Fuente */}
          <Ellipse cx={100} cy={HORIZON - 12} rx={30} ry={9} fill="#8FB8CF" opacity={0.85} />
          <Ellipse cx={100} cy={HORIZON - 14} rx={30} ry={9} fill="none" stroke={p.acentoOscuro} strokeWidth={3} opacity={0.6} />
          <Rect x={98} y={HORIZON - 30} width={4} height={16} fill="#B9C6CE" />
          <Ellipse cx={100} cy={HORIZON - 31} rx={9} ry={3} fill="#B9C6CE" />
          {Array.from({ length: 5 }, (_, i) => {
            const f = ((clock * 1.4 + i * 0.2) % 1);
            return (
              <Circle
                key={i}
                cx={100 + Math.cos(i * 1.3) * (4 + f * 12)}
                cy={HORIZON - 30 + f * 16}
                r={1.5}
                fill="#DDEEF6"
                opacity={1 - f}
              />
            );
          })}
          {/* Banco */}
          <Rect x={6} y={HORIZON - 14} width={40} height={4} rx={2} fill="#9C6B3F" />
          <Rect x={6} y={HORIZON - 24} width={40} height={4} rx={2} fill="#9C6B3F" />
          <Rect x={9} y={HORIZON - 14} width={3} height={14} fill={p.acentoOscuro} />
          <Rect x={40} y={HORIZON - 14} width={3} height={14} fill={p.acentoOscuro} />
          {/* Farol */}
          <Rect x={178} y={HORIZON - 54} width={4} height={54} fill={p.acentoOscuro} opacity={0.8} />
          <Circle cx={180} cy={HORIZON - 58} r={7} fill={isNight ? '#FFE9A0' : '#E8E4CE'} />
          {isNight ? <Circle cx={180} cy={HORIZON - 58} r={20} fill="#FFE9A0" opacity={0.14} /> : null}
          {/* Sendero */}
          <Path d={`M60 200 L88 ${HORIZON} L112 ${HORIZON} L140 200 Z`} fill="#E2D3A6" opacity={0.55} />
          {/* Palomas */}
          {[52, 68].map((x, i) => (
            <G key={i} opacity={0.75}>
              <Ellipse cx={x} cy={HORIZON + 26 + i * 6} rx={6} ry={4} fill="#8A8F96" />
              <Circle cx={x - 5} cy={HORIZON + 22 + i * 6} r={2.6} fill="#8A8F96" />
            </G>
          ))}
        </G>
      );
  }
}

function estrellas() {
  const puntos: [number, number, number][] = [
    [16, 14, 1.2], [42, 26, 0.9], [68, 10, 1.1], [96, 22, 0.8],
    [118, 12, 1], [186, 18, 1.1], [10, 44, 0.8], [80, 44, 0.9],
  ];
  return (
    <G>
      {puntos.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.85} />
      ))}
    </G>
  );
}

function lluvia(clock: number) {
  return (
    <G>
      {Array.from({ length: 22 }, (_, i) => {
        const f = ((clock * 1.5 + i * 0.19) % 1);
        const x = ((i * 37) % 200) + Math.sin(i) * 4;
        return (
          <Path
            key={i}
            d={`M${x} ${f * 210 - 12} l-2 9`}
            stroke="#BFE2F2"
            strokeWidth={1.6}
            opacity={0.75}
            strokeLinecap="round"
          />
        );
      })}
      {/* Charcos */}
      {[46, 104, 158].map((x, i) => (
        <Ellipse key={i} cx={x} cy={182 + i * 4} rx={16} ry={3.4} fill="#A8CFE0" opacity={0.35} />
      ))}
    </G>
  );
}

function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 20 },
});
