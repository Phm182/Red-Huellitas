import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Direccion, EstadoFantasma, PerfilFantasma } from './motor';

type PosFantasma = { id: PerfilFantasma; color: string; estado: EstadoFantasma; x: number; y: number };

type Props = {
  paredes: boolean[][];
  ancho: number;
  alto: number;
  /** Sólo cambia cuando se come un punto/pellet — ver el comentario largo en
   * `huepacman.tsx` sobre por qué esto NO se actualiza en cada cuadro. */
  puntos: Set<string>;
  pellets: Set<string>;
  pacman: { x: number; y: number; dir: Direccion | null };
  fantasmas: PosFantasma[];
  tileSize: number;
};

const COLOR_PARED = '#2A2AD6';
const COLOR_PARED_BORDE = '#5555FF';
const COLOR_FONDO = '#0A0A18';
const COLOR_PACMAN = '#F5D300';

/**
 * Contorno clásico de fantasma: domo arriba + 5 "patitas" onduladas abajo,
 * en un viewBox de 100x100 (mismo criterio de escala que
 * `huesoccer/FichaSkinSvg.tsx`/`huepool/BolaSkinSvg.tsx`). Se calcula UNA
 * sola vez a nivel de módulo — no depende de ninguna prop.
 */
function contornoFantasma(): string {
  const r = 40;
  const topY = 42;
  const bottomY = 88;
  let d = `M 10 ${bottomY} L 10 ${topY} A ${r} ${r} 0 0 1 90 ${topY} L 90 ${bottomY} `;
  const patitas = 5;
  const ancho = 80 / patitas;
  for (let i = patitas; i >= 1; i--) {
    const x1 = 10 + i * ancho;
    const x0 = 10 + (i - 1) * ancho;
    const xm = (x0 + x1) / 2;
    const yPunta = i % 2 === 0 ? bottomY - 12 : bottomY;
    d += `L ${xm} ${yPunta} L ${x0} ${bottomY} `;
  }
  return `${d}Z`;
}
const CONTORNO_FANTASMA = contornoFantasma();

/**
 * El laberinto en sí (paredes) — memoizado: no depende de nada que cambie
 * cuadro a cuadro (el layout es fijo, ver `motor.ts`), así que sólo se
 * recalcula si cambia el tamaño de tile (por ejemplo al rotar la pantalla).
 */
const LaberintoFondo = React.memo(function LaberintoFondo({
  paredes,
  ancho,
  alto,
  tileSize,
}: {
  paredes: boolean[][];
  ancho: number;
  alto: number;
  tileSize: number;
}) {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (!paredes[y]![x]) continue;
      rects.push(
        <Rect
          key={`${x}_${y}`}
          x={x * tileSize + 1}
          y={y * tileSize + 1}
          width={tileSize - 2}
          height={tileSize - 2}
          rx={tileSize * 0.22}
          fill={COLOR_PARED}
          stroke={COLOR_PARED_BORDE}
          strokeWidth={1}
        />
      );
    }
  }
  return (
    <Svg width={ancho * tileSize} height={alto * tileSize} style={StyleSheet.absoluteFill}>
      {rects}
    </Svg>
  );
});

/** Capa de puntos/power-pellets — memoizada aparte de los sprites que sí se
 * mueven cada cuadro (ver comentario de `Props.puntos` arriba): re-renderiza
 * sólo cuando de verdad se comió algo, no en cada posición nueva de Pac-Man. */
const CapaPuntos = React.memo(function CapaPuntos({
  puntos,
  pellets,
  tileSize,
}: {
  puntos: Set<string>;
  pellets: Set<string>;
  tileSize: number;
}) {
  const elementos: React.ReactNode[] = [];
  puntos.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    elementos.push(
      <Circle
        key={`d_${k}`}
        cx={x! * tileSize + tileSize / 2}
        cy={y! * tileSize + tileSize / 2}
        r={Math.max(1.5, tileSize * 0.08)}
        fill="#F5D9A8"
      />
    );
  });
  pellets.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    elementos.push(
      <Circle
        key={`p_${k}`}
        cx={x! * tileSize + tileSize / 2}
        cy={y! * tileSize + tileSize / 2}
        r={tileSize * 0.22}
        fill="#F5D9A8"
      />
    );
  });
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      {elementos}
    </Svg>
  );
});

/** Ángulo (grados) de la boca abierta de Pac-Man, sólo en función del reloj
 * — no hace falta ningún estado ni `useSharedValue` extra: este componente
 * ya se re-renderiza a cada cuadro del loop de juego (la posición cambia),
 * así que leer `Date.now()` acá adentro alcanza para el mordisco. */
function anguloBoca(): number {
  return 8 + Math.abs(Math.sin(Date.now() / 110)) * 30;
}

const ROTACION_POR_DIR: Record<Direccion, number> = { derecha: 0, abajo: 90, izquierda: 180, arriba: 270 };

function PacmanSprite({ size, dir }: { size: number; dir: Direccion | null }) {
  const boca = anguloBoca();
  const cx = 50;
  const cy = 50;
  const r = 46;
  const a1 = (boca * Math.PI) / 180;
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  const x2 = cx + r * Math.cos(-a1);
  const y2 = cy - r * Math.sin(-a1);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: `${ROTACION_POR_DIR[dir ?? 'derecha']}deg` }] }}>
      <Path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 1 0 ${x2} ${y2} Z`} fill={COLOR_PACMAN} />
    </Svg>
  );
}

function FantasmaSprite({ size, f, idInstancia }: { size: number; f: PosFantasma; idInstancia: string }) {
  const idGrad = `fantasmaBrillo_${idInstancia}`;
  const asustado = f.estado === 'asustado';
  const comido = f.estado === 'comido';
  const colorCuerpo = asustado ? '#2C3EE0' : f.color;

  if (comido) {
    // "Sólo los ojos" volviendo a casa — sin cuerpo, mismo lenguaje que el
    // arcade original cuando se come un fantasma.
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={38} cy={46} r={9} fill="#fff" />
        <Circle cx={62} cy={46} r={9} fill="#fff" />
        <Circle cx={40} cy={48} r={4} fill="#1A2A6B" />
        <Circle cx={64} cy={48} r={4} fill="#1A2A6B" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={idGrad} cx="35%" cy="26%" r="85%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <Stop offset="45%" stopColor="#ffffff" stopOpacity={0.03} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.28} />
        </RadialGradient>
      </Defs>
      <Path d={CONTORNO_FANTASMA} fill={colorCuerpo} />
      <Circle cx={38} cy={46} r={9} fill="#fff" />
      <Circle cx={62} cy={46} r={9} fill="#fff" />
      <Circle cx={asustado ? 38 : 40} cy={48} r={4} fill={asustado ? '#fff' : '#1A2A6B'} />
      <Circle cx={asustado ? 62 : 64} cy={48} r={4} fill={asustado ? '#fff' : '#1A2A6B'} />
      <Path d={CONTORNO_FANTASMA} fill={`url(#${idGrad})`} />
    </Svg>
  );
}

/**
 * El tablero de HuePacMan: laberinto fijo + puntos/pellets + Pac-Man + 3
 * fantasmas. A diferencia de `MesaPool.tsx`/`CanchaSoccer.tsx` (que
 * reproducen una trayectoria ya calculada entera), acá las posiciones que
 * llegan por props son el estado EN VIVO de un loop de tiempo real (ver
 * `huepacman.tsx`) — este componente sólo dibuja el cuadro actual, no sabe
 * nada de física ni de IA.
 */
export function TableroPacman({ paredes, ancho, alto, puntos, pellets, pacman, fantasmas, tileSize }: Props) {
  const lado = ancho * tileSize;
  const altoPx = alto * tileSize;
  const diametroPac = tileSize * 0.92;
  const diametroFantasma = tileSize * 0.95;

  return (
    <View style={[styles.tablero, { width: lado, height: altoPx, backgroundColor: COLOR_FONDO }]}>
      <LaberintoFondo paredes={paredes} ancho={ancho} alto={alto} tileSize={tileSize} />
      <CapaPuntos puntos={puntos} pellets={pellets} tileSize={tileSize} />

      <View
        pointerEvents="none"
        style={[
          styles.sprite,
          { width: diametroPac, height: diametroPac, left: pacman.x * tileSize + tileSize / 2 - diametroPac / 2, top: pacman.y * tileSize + tileSize / 2 - diametroPac / 2 },
        ]}
      >
        <PacmanSprite size={diametroPac} dir={pacman.dir} />
      </View>

      {fantasmas.map((f) => (
        <View
          key={f.id}
          pointerEvents="none"
          style={[
            styles.sprite,
            { width: diametroFantasma, height: diametroFantasma, left: f.x * tileSize + tileSize / 2 - diametroFantasma / 2, top: f.y * tileSize + tileSize / 2 - diametroFantasma / 2 },
          ]}
        >
          <FantasmaSprite size={diametroFantasma} f={f} idInstancia={f.id} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tablero: { position: 'relative', alignSelf: 'center', borderRadius: 8, overflow: 'hidden' },
  sprite: { position: 'absolute' },
});
