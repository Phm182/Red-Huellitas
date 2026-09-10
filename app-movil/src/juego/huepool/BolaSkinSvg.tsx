import React from 'react';
import Svg, { Circle, ClipPath, Defs, G, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

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
  /** Rodadura acumulada (rad) — ver `motor.ts::Cuerpo.rod`. */
  rod?: number;
  /** Dirección de avance (unit) en el instante — para rodar el número/franja
   * en la dirección correcta. */
  dirX?: number;
  dirY?: number;
};

/** Cuánto se desplaza la marca (número/franja) sobre la cara de la bola al
 * rodar: dentro del radio dibujable (46 en el viewBox de 100). */
const RECORRIDO = 30;

/**
 * Bola de pool con volumen/3D + rodadura real.
 *
 * El gradiente (blanco arriba-izq → sombra abajo-der, pintado como última
 * capa) da el bulto de esfera — mismo patrón ya resuelto en
 * `huesoccer/PelotaSkinSvg.tsx`. La luz NO rota con la bola: viene siempre
 * del mismo lado.
 *
 * La RODADURA: en vez de girar la bola entera en el plano (que se veía como
 * "gira sobre su eje" y no como una esfera que avanza), el número y la
 * franja se proyectan sobre una esfera que rueda alrededor del eje
 * perpendicular a `dir`. Un punto de la superficie que mira al espectador se
 * desplaza `RECORRIDO * sin(rod)` en sentido CONTRARIO al avance (queda
 * atrás mientras la bola rueda hacia adelante), se ve sólo si `cos(rod) > 0`
 * (si no, está en la cara de atrás) y se achica cerca del borde
 * (`sqrt(cos)`), de modo que "sube por el frente y se va por arriba".
 */
export function BolaSkinSvg({
  numero,
  esRayada,
  color,
  esBlanca,
  size,
  idInstancia,
  rod = 0,
  dirX = 0,
  dirY = 0,
}: Props) {
  const idGrad = `bolaEsfera_${idInstancia}`;
  const idClip = `bolaClip_${idInstancia}`;

  // Proyección del punto "cara al espectador" tras rodar `rod`.
  const c = Math.cos(rod);
  const s = Math.sin(rod);
  const visible = c > -0.15;
  const esc = Math.sqrt(Math.max(0.001, Math.min(1, c)));
  // La marca queda ATRÁS respecto del avance: -dir.
  const mx = 50 - RECORRIDO * s * dirX;
  const my = 50 - RECORRIDO * s * dirY;
  const opacidadMarca = visible ? Math.max(0, Math.min(1, c * 1.2 + 0.15)) : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={idGrad} cx="32%" cy="28%" r="80%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
          <Stop offset="40%" stopColor="#ffffff" stopOpacity={0.04} />
          <Stop offset="78%" stopColor="#000000" stopOpacity={0.08} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.5} />
        </RadialGradient>
        <ClipPath id={idClip}>
          <Circle cx={50} cy={50} r={46} />
        </ClipPath>
      </Defs>

      {/* Base de la bola: color liso (o crema si es rayada, con la franja
          aparte rodando). */}
      <Circle
        cx={50}
        cy={50}
        r={46}
        fill={esBlanca ? '#F8F8F2' : esRayada ? '#F4F1E6' : color}
        stroke="#00000033"
        strokeWidth={1}
      />

      <G clipPath={`url(#${idClip})`}>
        {esRayada ? (
          // Franja: banda que rueda con la bola (centro desplazado por la
          // rodadura, perpendicular al avance da lo mismo: se ve girar).
          <Rect
            x={-10}
            y={my - 18}
            width={120}
            height={36}
            fill={color}
            opacity={visible ? 0.95 : 0}
          />
        ) : null}

        {esBlanca ? (
          // Punto tenue fuera de centro: sin una marca, una esfera lisa no
          // deja ver que rueda.
          <Circle cx={mx + 14} cy={my - 12} r={5 * esc} fill="#00000018" opacity={opacidadMarca} />
        ) : (
          <>
            <Circle cx={mx} cy={my} r={26 * esc} fill="#F4F1E6" opacity={opacidadMarca} />
            <SvgText
              x={mx}
              y={my + 11 * esc}
              fontSize={30 * esc}
              fill="#1A1A1A"
              textAnchor="middle"
              fontWeight="bold"
              opacity={opacidadMarca}
            >
              {numero}
            </SvgText>
          </>
        )}
      </G>

      {/* Brillo/bulto encima de todo: da la sensación de esfera y NO rota. */}
      <Circle cx={50} cy={50} r={46} fill={`url(#${idGrad})`} />
    </Svg>
  );
}
