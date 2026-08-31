import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { SkinFichaId, VarianteSkin } from './skins';

type Props = {
  skin: SkinFichaId;
  variante: VarianteSkin;
  /** Color de equipo (siempre presente, distingue j:1 de j:2 aunque el skin coincida). */
  colorEquipo: string;
  size: number;
};

/**
 * Dibuja una ficha: el relleno de base es SIEMPRE el color de equipo (así
 * las fichas de los dos jugadores nunca se confunden, coincida o no el
 * skin) — el "skin" es el patrón/acento que va encima, en un color que sí
 * cambia entre `primaria`/`secundaria` para poder distinguir dos fichas del
 * MISMO skin si los dos rivales lo eligieron igual (ver
 * `resolverSkinsPartido` en `skins.ts`).
 */
export function FichaSkinSvg({ skin, variante, colorEquipo, size }: Props) {
  const acento = variante === 'primaria' ? '#FFFFFF' : '#FFD34D';
  const r = 46;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={r} fill={colorEquipo} stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
      {skin === 'rayada' ? (
        <>
          <Line x1={20} y1={70} x2={40} y2={20} stroke={acento} strokeWidth={9} strokeLinecap="round" />
          <Line x1={45} y1={78} x2={65} y2={22} stroke={acento} strokeWidth={9} strokeLinecap="round" />
          <Line x1={70} y1={80} x2={85} y2={40} stroke={acento} strokeWidth={9} strokeLinecap="round" />
        </>
      ) : null}
      {skin === 'lunares' ? (
        <>
          <Circle cx={38} cy={35} r={8} fill={acento} />
          <Circle cx={64} cy={40} r={8} fill={acento} />
          <Circle cx={45} cy={65} r={8} fill={acento} />
          <Circle cx={68} cy={68} r={7} fill={acento} />
        </>
      ) : null}
      {skin === 'bicolor' ? (
        <Path d={`M 50 ${50 - r} A ${r} ${r} 0 0 1 50 ${50 + r} Z`} fill={acento} />
      ) : null}
      {skin === 'estrella' ? (
        <Path
          d="M50 22 L58 42 L80 42 L62 55 L69 76 L50 63 L31 76 L38 55 L20 42 L42 42 Z"
          fill={acento}
        />
      ) : null}
      {/* 'clasica': sin patrón encima, sólo el color de equipo. */}
    </Svg>
  );
}
