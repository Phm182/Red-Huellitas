import React from 'react';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

type Props = {
  /** Número de la bola (0 = blanca). */
  numero: number;
  /** Lisa (1-7, 8) o rayada (9-15). Ignorado si `esBlanca`. */
  esRayada: boolean;
  /** Color base de la bola (o de la franja, si es rayada). Ignorado si `esBlanca`. */
  color: string;
  esBlanca?: boolean;
  size: number;
  /**
   * Id único de ESTA bola en la mesa (su número alcanza, no hay dos bolas
   * con el mismo número en juego). Mismo motivo que `idInstancia` en
   * `huesoccer/FichaSkinSvg.tsx`: con 16 bolas en el mismo documento SVG,
   * un `id` de `<RadialGradient>` compartido no garantiza cuál gradiente
   * gana en Android real (el bug ya se vio y se resolvió ahí primero).
   */
  idInstancia: number;
};

/**
 * Bola de pool con volumen/3D — mismo patrón de gradiente ya resuelto en
 * `huesoccer/PelotaSkinSvg.tsx`/`FichaSkinSvg.tsx` (blanco brillante
 * arriba-izquierda → sombra oscura abajo-derecha, pintado como última
 * capa), antes ausente acá: las bolas eran `<Circle>` de color plano (y la
 * blanca ni siquiera SVG, un `View` liso).
 *
 * La blanca lleva además un anillo tenue fuera de centro — sin ninguna
 * marca, una esfera lisa de un solo color no deja ver el giro que le
 * agrega el motor de física (ver `motor.ts`: `angulo`/`velAngular`), y es
 * justo la bola que más se juega.
 */
export function BolaSkinSvg({ numero, esRayada, color, esBlanca, size, idInstancia }: Props) {
  const idGrad = `bolaEsfera_${idInstancia}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={idGrad} cx="32%" cy="28%" r="80%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
          <Stop offset="40%" stopColor="#ffffff" stopOpacity={0.04} />
          <Stop offset="78%" stopColor="#000000" stopOpacity={0.08} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.5} />
        </RadialGradient>
      </Defs>

      {esBlanca ? (
        <>
          <Circle cx={50} cy={50} r={46} fill="#F8F8F2" stroke="#00000030" strokeWidth={1} />
          {/* Marca sutil, fuera de centro: sin esto el giro de la blanca no se nota. */}
          <Circle cx={68} cy={35} r={5} fill="#00000014" />
        </>
      ) : (
        <>
          <Circle
            cx={50}
            cy={50}
            r={46}
            fill={esRayada ? '#F4F1E6' : color}
            stroke="#00000040"
            strokeWidth={1}
          />
          {esRayada ? <Rect x={4} y={32} width={92} height={36} fill={color} /> : null}
          <Circle cx={50} cy={50} r={28} fill="#F4F1E6" />
          <SvgText x={50} y={61} fontSize={32} fill="#1A1A1A" textAnchor="middle" fontWeight="bold">
            {numero}
          </SvgText>
        </>
      )}

      {/* Brillo/bulto encima de todo: es lo que da la sensación de esfera. */}
      <Circle cx={50} cy={50} r={46} fill={`url(#${idGrad})`} />
    </Svg>
  );
}
