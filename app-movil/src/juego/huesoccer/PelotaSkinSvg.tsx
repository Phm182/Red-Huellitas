import React from 'react';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { SkinPelotaId } from './skins';

type Props = { skin: SkinPelotaId; size: number };

/**
 * Sombreado esférico, común a las 5 skins.
 *
 * La pelota mide unos 20px en cancha (radioPelota=10 con la escala típica):
 * a ese tamaño ningún patrón fino se distingue, pero un degradé sí — es lo
 * que hace que se lea como una ESFERA con volumen (brillo arriba a la
 * izquierda, sombra abajo a la derecha) y no como un círculo plano con
 * manchas, que es justo la queja ("ahora parece cualquier cosa"). Va
 * siempre encima, como último elemento de cada variante.
 */
function SombraEsfera() {
  return (
    <>
      <Defs>
        <RadialGradient id="pelotaEsfera" cx="32%" cy="28%" r="80%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
          <Stop offset="40%" stopColor="#ffffff" stopOpacity={0.04} />
          <Stop offset="78%" stopColor="#000000" stopOpacity={0.08} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.5} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill="url(#pelotaEsfera)" />
    </>
  );
}

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
        <SombraEsfera />
      </Svg>
    );
  }
  if (skin === 'tricolor') {
    // Antes eran 3 gajos que llenaban TODA la pelota — a los ~20px que mide
    // en cancha eso se leía como una ruleta/torta de colores, no como una
    // pelota ("las skins no son nada que ver [con una pelota]"). Ahora usa
    // el mismo lenguaje que 'clasica' (base clara + parches con forma de
    // pentágono, como los paneles de una pelota de verdad), sólo que en
    // color en vez de negro.
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="#F5F5F5" stroke="#22223B" strokeWidth={2} />
        <Path d="M50 26 L66 37 L60 56 L40 56 L34 37 Z" fill="#3D9970" />
        <Path d="M14 46 L26 33 L20 56 Z" fill="#E8577E" />
        <Path d="M86 46 L74 33 L80 56 Z" fill="#5B9AD6" />
        <Path d="M30 88 L38 66 L58 66 L66 88 Z" fill="#3D9970" opacity={0.85} />
        <SombraEsfera />
      </Svg>
    );
  }
  if (skin === 'arcoiris') {
    // Mismo motivo que 'tricolor': la rueda de 6 gajos enteros se veía como
    // un ícono de "color wheel", no como una pelota. Ahora son parches
    // chicos con forma de pentágono (como los paneles negros de 'clasica'),
    // uno por color, sobre base blanca — se lee como pelota primero, y
    // "de muchos colores" segundo, en vez de al revés.
    const colores = ['#E8577E', '#F0A830', '#3D9970', '#5B9AD6', '#B36FE0', '#F5E663'];
    const parches = [
      'M50 26 L66 37 L60 56 L40 56 L34 37 Z', // central
      'M14 46 L26 33 L20 56 Z', // izquierda
      'M86 46 L74 33 L80 56 Z', // derecha
      'M30 88 L38 66 L58 66 L66 88 Z', // abajo
      'M22 16 L34 12 L36 24 L24 28 Z', // arriba-izquierda
      'M78 16 L66 12 L64 24 L76 28 Z', // arriba-derecha
    ];
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="#F5F5F5" stroke="#22223B" strokeWidth={2} />
        {parches.map((d, i) => (
          <Path key={colores[i]} d={d} fill={colores[i]} />
        ))}
        <SombraEsfera />
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
        <SombraEsfera />
      </Svg>
    );
  }
  // 'clasica': blanco con pentágonos negros, estilo pelota clásica — formas
  // grandes y pocas (no 5 manchitas chicas) para que se lean a los ~20px
  // que mide la pelota en cancha.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill="#F5F5F5" stroke="#222" strokeWidth={2} />
      <Path d="M50 26 L66 37 L60 56 L40 56 L34 37 Z" fill="#1c1c1c" />
      <Path d="M14 46 L26 33 L20 56 Z" fill="#1c1c1c" opacity={0.9} />
      <Path d="M86 46 L74 33 L80 56 Z" fill="#1c1c1c" opacity={0.9} />
      <Path d="M30 88 L38 66 L58 66 L66 88 Z" fill="#1c1c1c" opacity={0.9} />
      <SombraEsfera />
    </Svg>
  );
}
