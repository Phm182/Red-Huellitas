import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { SkinPelotaId } from './skins';

type Props = { skin: SkinPelotaId; size: number };

/**
 * Dibuja la pelota según el skin. Nombres y diseños inventados a propósito
 * (ver comentario de cabecera de `skins.ts`) — el estilo se inspira en
 * looks genéricos de pelota de fútbol, no en marcas registradas.
 */
export function PelotaSkinSvg({ skin, size }: Props) {
  if (skin === 'cueroRetro') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="#B77A3C" stroke="#7A4E22" strokeWidth={2} />
        <Path d="M8 50 A42 42 0 0 1 92 50" stroke="#7A4E22" strokeWidth={3} fill="none" />
        <Path d="M8 50 A42 42 0 0 0 92 50" stroke="#7A4E22" strokeWidth={3} fill="none" />
        <Path d="M50 4 A46 46 0 0 1 50 96" stroke="#7A4E22" strokeWidth={3} fill="none" />
      </Svg>
    );
  }
  if (skin === 'tricolor') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="#FFFFFF" stroke="#22223B" strokeWidth={2} />
        <Path d="M50 50 L50 4 A46 46 0 0 1 90 27 Z" fill="#3D9970" />
        <Path d="M50 50 L90 27 A46 46 0 0 1 90 73 Z" fill="#E8577E" />
        <Path d="M50 50 L90 73 A46 46 0 0 1 50 96 Z" fill="#5B9AD6" />
        <Circle cx={50} cy={50} r={10} fill="#FFD34D" />
      </Svg>
    );
  }
  if (skin === 'arcoiris') {
    const colores = ['#E8577E', '#F0A830', '#F5E663', '#3D9970', '#5B9AD6', '#B36FE0'];
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="#111" />
        {colores.map((c, i) => {
          const a0 = (i / colores.length) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / colores.length) * Math.PI * 2 - Math.PI / 2;
          const x0 = 50 + 46 * Math.cos(a0);
          const y0 = 50 + 46 * Math.sin(a0);
          const x1 = 50 + 46 * Math.cos(a1);
          const y1 = 50 + 46 * Math.sin(a1);
          return <Path key={c} d={`M50 50 L${x0} ${y0} A46 46 0 0 1 ${x1} ${y1} Z`} fill={c} />;
        })}
      </Svg>
    );
  }
  if (skin === 'lunar') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="#1B2A4A" stroke="#0E1730" strokeWidth={2} />
        <Circle cx={35} cy={38} r={9} fill="#3E5588" />
        <Circle cx={64} cy={32} r={6} fill="#3E5588" />
        <Circle cx={62} cy={62} r={11} fill="#3E5588" />
        <Circle cx={32} cy={66} r={5} fill="#3E5588" />
      </Svg>
    );
  }
  // 'clasica': blanco con pentágonos negros, estilo pelota clásica.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill="#F5F5F5" stroke="#222" strokeWidth={2} />
      <Path d="M50 32 L61 40 L57 53 L43 53 L39 40 Z" fill="#222" />
      <Path d="M20 30 L28 24 L34 30 L31 40 L21 40 Z" fill="#222" opacity={0.85} />
      <Path d="M80 30 L72 24 L66 30 L69 40 L79 40 Z" fill="#222" opacity={0.85} />
      <Path d="M28 75 L36 68 L46 72 L44 82 L32 84 Z" fill="#222" opacity={0.85} />
      <Path d="M72 75 L64 68 L54 72 L56 82 L68 84 Z" fill="#222" opacity={0.85} />
    </Svg>
  );
}
