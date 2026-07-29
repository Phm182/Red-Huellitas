import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { EspecieHue } from '../types';
import { HueGotchiState } from '../types';

type Props = {
  size: number;
  especie: EspecieHue;
  state: HueGotchiState;
  /** Hex pelaje */
  coat?: string;
  /** look -1..1 (ojos / cabeza) */
  lookX?: number;
  lookY?: number;
};

const COAT_DEFAULT: Record<EspecieHue, string> = {
  gato: '#F0A86A',
  perro: '#D4A574',
  otro: '#C4B5A0',
};

/**
 * Personaje clay 2.5D vectorial (sin GIF ni Rive).
 * Volumen con gradientes radiales + ojos que siguen lookX/Y.
 */
export function ClayPet({
  size,
  especie,
  state,
  coat,
  lookX = 0,
  lookY = 0,
}: Props) {
  const base = coat || COAT_DEFAULT[especie];
  const dark = shade(base, -28);
  const light = shade(base, 36);
  const lx = lookX * 5;
  const ly = lookY * 4;
  const sleeping = state === 'sleeping';
  const sad = state === 'sad';
  const happy = state === 'happy' || state === 'playing' || state === 'poke';
  const earTip = especie === 'perro' ? 18 : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="bodyGrad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="55%" stopColor={base} />
          <Stop offset="100%" stopColor={dark} />
        </RadialGradient>
        <RadialGradient id="bellyGrad" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#FFF8F0" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#F5E6D3" stopOpacity="0.75" />
        </RadialGradient>
        <RadialGradient id="headGrad" cx="40%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="70%" stopColor={base} />
          <Stop offset="100%" stopColor={dark} />
        </RadialGradient>
        <RadialGradient id="shine" cx="35%" cy="28%" r="40%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Sombra bajo el personaje */}
      <Ellipse cx="100" cy="178" rx="48" ry="10" fill="#1A120C" opacity="0.2" />

      {/* Cola */}
      <Path
        d={
          especie === 'perro'
            ? 'M145 120 C175 100, 178 70, 160 58'
            : 'M148 118 C175 105, 180 75, 168 55'
        }
        stroke={base}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={
          especie === 'perro'
            ? 'M145 120 C175 100, 178 70, 160 58'
            : 'M148 118 C175 105, 180 75, 168 55'
        }
        stroke={light}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />

      {/* Cuerpo */}
      <Ellipse cx="100" cy="128" rx="52" ry="46" fill="url(#bodyGrad)" />
      <Ellipse cx="100" cy="138" rx="32" ry="26" fill="url(#bellyGrad)" />
      <Ellipse cx="78" cy="108" rx="22" ry="16" fill="url(#shine)" />

      {/* Cabeza (grupo se traslada con look en InteractivePet; acá pupils) */}
      <G>
        {/* Orejas */}
        {especie === 'gato' ? (
          <>
            <Path d="M58 70 L48 28 L82 58 Z" fill={base} />
            <Path d="M62 64 L54 36 L78 56 Z" fill="#F6C1A0" opacity="0.85" />
            <Path d="M142 70 L152 28 L118 58 Z" fill={base} />
            <Path d="M138 64 L146 36 L122 56 Z" fill="#F6C1A0" opacity="0.85" />
          </>
        ) : (
          <>
            <Ellipse cx="62" cy={58 - earTip * 0.2} rx="22" ry="28" fill={base} />
            <Ellipse cx="62" cy={58 - earTip * 0.2} rx="12" ry="16" fill="#E8C4A8" opacity="0.7" />
            <Ellipse cx="138" cy={58 - earTip * 0.2} rx="22" ry="28" fill={base} />
            <Ellipse cx="138" cy={58 - earTip * 0.2} rx="12" ry="16" fill="#E8C4A8" opacity="0.7" />
          </>
        )}

        <Circle cx="100" cy="78" r="48" fill="url(#headGrad)" />
        <Ellipse cx="82" cy="62" rx="18" ry="12" fill="url(#shine)" />

        {/* Ojos */}
        {sleeping ? (
          <>
            <Path d="M78 78 Q88 84 98 78" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
            <Path d="M102 78 Q112 84 122 78" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <Ellipse cx={88 + lx} cy={76 + ly + (sad ? 2 : 0)} rx="11" ry={happy ? 13 : 11} fill="#FFF" />
            <Ellipse cx={112 + lx} cy={76 + ly + (sad ? 2 : 0)} rx="11" ry={happy ? 13 : 11} fill="#FFF" />
            <Circle cx={88 + lx * 1.4} cy={77 + ly * 1.3} r="5.5" fill="#1C1C1C" />
            <Circle cx={112 + lx * 1.4} cy={77 + ly * 1.3} r="5.5" fill="#1C1C1C" />
            <Circle cx={90 + lx * 1.4} cy={75 + ly * 1.3} r="1.8" fill="#FFF" />
            <Circle cx={114 + lx * 1.4} cy={75 + ly * 1.3} r="1.8" fill="#FFF" />
          </>
        )}

        {/* Nariz / hocico */}
        {especie === 'perro' ? (
          <Ellipse cx="100" cy="92" rx="10" ry="7" fill="#2B2B2B" />
        ) : (
          <Path d="M100 88 L94 96 L106 96 Z" fill="#E8899A" />
        )}

        {/* Boca */}
        {happy ? (
          <Path d="M90 102 Q100 112 110 102" stroke="#5A3A3A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : sad ? (
          <Path d="M92 108 Q100 100 108 108" stroke="#5A3A3A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : sleeping ? (
          <Path d="M96 104 Q100 106 104 104" stroke="#5A3A3A" strokeWidth="2" fill="none" />
        ) : (
          <Path d="M96 104 Q100 108 104 104" stroke="#5A3A3A" strokeWidth="2" fill="none" />
        )}

        {/* Bigotes gato */}
        {especie === 'gato' && !sleeping ? (
          <>
            <Path d="M70 94 H48" stroke={dark} strokeWidth="1.5" opacity="0.55" />
            <Path d="M72 100 H46" stroke={dark} strokeWidth="1.5" opacity="0.55" />
            <Path d="M130 94 H152" stroke={dark} strokeWidth="1.5" opacity="0.55" />
            <Path d="M128 100 H154" stroke={dark} strokeWidth="1.5" opacity="0.55" />
          </>
        ) : null}
      </G>

      {/* Patas delanteras */}
      <Ellipse cx="78" cy="160" rx="14" ry="10" fill={dark} />
      <Ellipse cx="122" cy="160" rx="14" ry="10" fill={dark} />
      <Ellipse cx="78" cy="158" rx="10" ry="6" fill={light} opacity="0.35" />
      <Ellipse cx="122" cy="158" rx="10" ry="6" fill={light} opacity="0.35" />
    </Svg>
  );
}

/** Aclara / oscurece un hex. */
function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0xff) + amount;
  let b = (num & 0xff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
