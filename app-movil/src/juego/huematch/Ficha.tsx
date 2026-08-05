import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * Las 6 fichas de HueMatch.
 *
 * Cada una tiene forma Y color propios, no sólo color. Un match-3 que se juega
 * únicamente por color es injugable para alguien con daltonismo, que es
 * bastante común; con la silueta distinta se puede jugar igual sin distinguir
 * los tonos.
 */

/**
 * Las 6 primeras son las de HueMatch. Las 2 últimas existen sólo para HueMemo,
 * que necesita 8 pares para una grilla de 4x4; el match-3 no las usa porque con
 * 8 colores en el tablero los tríos se vuelven demasiado raros y el juego se
 * traba.
 */
export const COLORES = [
  '#E8577E', // huella  - rosa
  '#E8A54C', // hueso   - naranja
  '#5B9AD6', // pelota  - azul
  '#4CC3A5', // pez     - verde agua
  '#B36FE0', // corazon - violeta
  '#F2C744', // estrella- amarillo
  '#7E8FE0', // casita  - lavanda
  '#E06F6F', // gotita  - rojo suave
];

function Huella({ c }: { c: string }) {
  return (
    <G>
      <Ellipse cx="50" cy="62" rx="24" ry="20" fill={c} />
      <Ellipse cx="28" cy="34" rx="9" ry="12" fill={c} />
      <Ellipse cx="45" cy="26" rx="9" ry="13" fill={c} />
      <Ellipse cx="63" cy="28" rx="9" ry="12" fill={c} />
      <Ellipse cx="77" cy="42" rx="8" ry="11" fill={c} />
    </G>
  );
}

function Hueso({ c }: { c: string }) {
  return (
    <G>
      <Path d="M30 38 L70 38 L70 62 L30 62 Z" fill={c} />
      <Circle cx="27" cy="38" r="13" fill={c} />
      <Circle cx="27" cy="62" r="13" fill={c} />
      <Circle cx="73" cy="38" r="13" fill={c} />
      <Circle cx="73" cy="62" r="13" fill={c} />
    </G>
  );
}

function Pelota({ c }: { c: string }) {
  return (
    <G>
      <Circle cx="50" cy="50" r="32" fill={c} />
      {/* Las costuras evitan que la pelota se lea como un punto de color. */}
      <Path d="M22 34 Q50 50 22 66" stroke="#fff" strokeWidth="5" fill="none" opacity={0.85} />
      <Path d="M78 34 Q50 50 78 66" stroke="#fff" strokeWidth="5" fill="none" opacity={0.85} />
    </G>
  );
}

function Pez({ c }: { c: string }) {
  return (
    <G>
      <Ellipse cx="46" cy="50" rx="30" ry="20" fill={c} />
      <Path d="M74 50 L92 34 L92 66 Z" fill={c} />
      <Circle cx="32" cy="45" r="4.5" fill="#fff" />
    </G>
  );
}

function Corazon({ c }: { c: string }) {
  return (
    <Path
      d="M50 80 C20 58 16 40 28 30 C38 22 48 28 50 36 C52 28 62 22 72 30 C84 40 80 58 50 80 Z"
      fill={c}
    />
  );
}

function Estrella({ c }: { c: string }) {
  return (
    <Path
      d="M50 16 L60 40 L86 42 L66 58 L72 84 L50 70 L28 84 L34 58 L14 42 L40 40 Z"
      fill={c}
    />
  );
}

function Casita({ c }: { c: string }) {
  return (
    <G>
      <Path d="M50 16 L88 48 L78 48 L78 84 L22 84 L22 48 L12 48 Z" fill={c} />
      {/* La puerta en blanco evita que se lea como un triángulo sobre un cuadrado. */}
      <Path d="M40 84 L40 60 L60 60 L60 84 Z" fill="#fff" opacity={0.9} />
    </G>
  );
}

function Gotita({ c }: { c: string }) {
  return <Path d="M50 12 C50 12 78 46 78 62 A28 28 0 0 1 22 62 C22 46 50 12 50 12 Z" fill={c} />;
}

const DIBUJOS = [Huella, Hueso, Pelota, Pez, Corazon, Estrella, Casita, Gotita];

type Props = { tipo: number; size: number };

export function Ficha({ tipo, size }: Props) {
  const Dibujo = DIBUJOS[tipo];
  if (!Dibujo) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Dibujo c={COLORES[tipo]!} />
    </Svg>
  );
}
