import React from 'react';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { colorContrastante, SkinFichaId } from './skins';

type Props = {
  skin: SkinFichaId;
  /**
   * Color elegido para la ficha — ya resuelto (si coincidía con el rival, ya
   * viene con la colisión decidida, ver `resolverColorFicha` en
   * `skins.ts`). Es lo que distingue a los dos jugadores ahora; antes era
   * fijo por jugador (rosa/azul) y no se podía elegir.
   */
  colorEquipo: string;
  size: number;
};

/** Cuántas muescas tiene el borde, como una ficha de casino de verdad. */
const MUESCAS = 12;

/**
 * Ficha con look de ficha de casino: cuerpo con degradé (bulto/3D), borde con
 * muescas, y un disco interno más chico con el patrón del skin adentro — en
 * vez del círculo plano de un solo color de antes ("Soccer Star" de
 * referencia usa fichas con volumen, no manchas planas).
 *
 * El patrón del disco interno usa el color que más contraste tenga contra
 * `colorEquipo` (blanco o casi negro) — antes era un color fijo
 * (`primaria`/`secundaria`) para poder distinguir dos fichas con el MISMO
 * patrón; ahora esa distinción la hace directamente el color elegido (ver
 * `resolverColorFicha`), así que el patrón sólo necesita leerse bien contra
 * SU PROPIO color, sin pensar en el rival.
 */
export function FichaSkinSvg({ skin, colorEquipo, size }: Props) {
  const acento = colorContrastante(colorEquipo);
  const idGrad = `fichaBulto`;
  const idBorde = `fichaBorde`;

  const muescas = Array.from({ length: MUESCAS }, (_, i) => {
    const a = (i / MUESCAS) * Math.PI * 2;
    const x1 = 50 + 40 * Math.cos(a);
    const y1 = 50 + 40 * Math.sin(a);
    const x2 = 50 + 46 * Math.cos(a);
    const y2 = 50 + 46 * Math.sin(a);
    return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffffb0" strokeWidth={3} />;
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={idGrad} cx="35%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <Stop offset="45%" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
        </RadialGradient>
        <RadialGradient id={idBorde} cx="50%" cy="50%" r="50%">
          <Stop offset="82%" stopColor={colorEquipo} stopOpacity={0} />
          <Stop offset="86%" stopColor="#000000" stopOpacity={0.35} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Cuerpo: color de equipo parejo, muescas de "canto de ficha" encima. */}
      <Circle cx={50} cy={50} r={46} fill={colorEquipo} stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} />
      {muescas}
      <Circle cx={50} cy={50} r={46} fill="url(#fichaBorde)" />

      {/* Disco interno: acá va el patrón del skin, como el "valor" grabado de una ficha real. */}
      <Circle cx={50} cy={50} r={30} fill={colorEquipo} stroke={acento} strokeWidth={2.5} opacity={0.94} />

      {skin === 'rayada' ? (
        <>
          <Line x1={32} y1={62} x2={42} y2={38} stroke={acento} strokeWidth={7} strokeLinecap="round" />
          <Line x1={44} y1={64} x2={54} y2={36} stroke={acento} strokeWidth={7} strokeLinecap="round" />
          <Line x1={56} y1={62} x2={66} y2={40} stroke={acento} strokeWidth={7} strokeLinecap="round" />
        </>
      ) : null}
      {skin === 'lunares' ? (
        <>
          <Circle cx={42} cy={40} r={6} fill={acento} />
          <Circle cx={60} cy={42} r={6} fill={acento} />
          <Circle cx={46} cy={60} r={6} fill={acento} />
          <Circle cx={62} cy={60} r={5} fill={acento} />
        </>
      ) : null}
      {skin === 'bicolor' ? <Path d="M50 20 A30 30 0 0 1 50 80 Z" fill={acento} /> : null}
      {skin === 'estrella' ? (
        <Path
          d="M50 28 L55.5 41.5 L70 42.5 L58.5 51.5 L62.5 65.5 L50 57.5 L37.5 65.5 L41.5 51.5 L30 42.5 L44.5 41.5 Z"
          fill={acento}
        />
      ) : (
        // 'clasica' también entra acá cuando no matchea ningún patrón de arriba,
        // así siempre queda un punto central — sin esto el disco interno se ve
        // vacío/sin terminar comparado con las otras 4 skins.
        skin === 'clasica' && <Circle cx={50} cy={50} r={7} fill={acento} />
      )}

      {/* Brillo/bulto general encima de todo: es lo que da la sensación de 3D. */}
      <Circle cx={50} cy={50} r={46} fill="url(#fichaBulto)" />
    </Svg>
  );
}
