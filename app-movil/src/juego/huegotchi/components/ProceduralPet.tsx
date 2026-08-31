import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { ResolvedBreed } from '../domain/breeds';
import { Pose } from '../domain/poses';

type Props = {
  size: number;
  breed: ResolvedBreed;
  pose: Pose;
  lookX?: number;
  lookY?: number;
  squash?: number;
  stretch?: number;
  /** 1 = mira a la derecha, -1 = espejado (la visita mira al dueño). */
  facing?: 1 | -1;
  /** Orientación de cámara: perfil (3/4), frente o espalda. */
  viewMode?: 'perfil' | 'frente' | 'espalda';
  uid?: string;
  clock: number;
};

/** Tinta del contorno: fija, no un tono del pelo — se lee igual de firme en
 * un animal claro que en uno oscuro, como en las referencias de estilo. */
const INK = '#2E2620';

const GROUND_Y = 150;
/**
 * Escala interna del personaje dentro del viewBox. Deja margen para cola,
 * saltos y squash/stretch sin que el overflow:hidden del stage lo recorte.
 */
const PET_FIT = 0.78;

type Pt = [number, number];

/**
 * Personaje procedural con anatomía real, en perfil de 3/4 mirando a la derecha.
 *
 * La versión anterior apilaba cápsulas y rectángulos y salía un bulto: no se
 * distinguía el lomo del cuello ni la cabeza del hocico. Acá cada parte es una
 * silueta continua suavizada (`curvaCerrada`) construida desde puntos
 * anatómicos, y las patas traseras tienen corvejón — que es lo que hace que el
 * ojo lea "animal" y no "figura geométrica".
 *
 * Las proporciones salen de `breed`, la actitud de `pose`.
 */
export function ProceduralPet({
  size,
  breed,
  pose,
  lookX = 0,
  lookY = 0,
  squash = 0,
  stretch = 0,
  facing = 1,
  viewMode = 'perfil',
  uid = 'p',
  clock,
}: Props) {
  const b = breed;
  const S = b.scale;
  const id = (n: string) => `${n}_${uid}`;

  if (b.species === 'tortuga') {
    return <Tortuga size={size} breed={b} pose={pose} uid={uid} facing={facing} lookX={lookX} />;
  }
  if (b.species === 'ave') {
    return <Ave size={size} breed={b} pose={pose} uid={uid} facing={facing} lookX={lookX} lookY={lookY} clock={clock} />;
  }
  if (b.species === 'pez') {
    return <Pez size={size} breed={b} pose={pose} uid={uid} facing={facing} lookX={lookX} lookY={lookY} clock={clock} />;
  }

  if (viewMode === 'frente' || viewMode === 'espalda') {
    return (
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G transform={`translate(100 ${GROUND_Y}) scale(${PET_FIT}) translate(-100 ${-GROUND_Y})`}>
          <VistaOrtogonal
            breed={b}
            pose={pose}
            mode={viewMode}
            lookX={lookX}
            lookY={lookY}
            squash={squash}
            stretch={stretch}
            uid={uid}
            clock={clock}
          />
        </G>
      </Svg>
    );
  }

  const esGato = b.species === 'gato';
  const sit = pose.sit;
  const lie = pose.lie ?? 0;

  // ------------------------------------------------------- esqueleto
  // Patas más cortas que antes: con la proporción "real" (11 + 27*legLength)
  // el bicho quedaba muy parado en zancos comparado con el estilo cartoon
  // de referencia, y además una pata larga es la que más se nota rara al
  // plegarse para sentarse.
  const legHBase = (5 + 13 * b.legLength) * S;
  const torsoH = 26 * b.bodyHeight * S;
  const torsoLen = 62 * b.bodyLength * S;
  // La silueta de la cabeza abarca ~2.5 radios (cráneo + morro). Con radio 18
  // quedaba más alta que el torso entero y el bicho parecía un cabezón; 12.5
  // deja la cabeza en ~45% del largo del lomo, que es proporción de dibujo
  // animado sin llegar a deformidad.
  const headR = 12.5 * b.headSize * S;
  const muzLen = headR * (0.22 + 1.0 * b.snoutLength);
  const muzDrop = headR * (0.24 + 0.1 * b.snoutLength);

  // Sentado: un animal sentado no es "parado con la cadera más abajo" — se
  // PLIEGA el muslo trasero como una bisagra, así que la cadera se acerca al
  // pecho de costado (el torso se ve más corto) y a la vez queda bastante
  // alta, apoyada sobre el muslo doblado, no aplastada contra el piso. Las
  // patas delanteras se quedan rectas: son las que sostienen el pecho.
  //
  // Acostado: acá el error anterior era que sólo bajaba la grupa y el pecho
  // se quedaba a altura de "parado" — medio cuerpo en el aire, la otra
  // mitad hundida, ilegible. Cuando de verdad se acuesta TODO el lomo baja
  // parejo: las patas delanteras se acortan igual que las traseras, no hace
  // falta acercar la cadera (el cuerpo no se pliega, se aplana entero).
  const tuck = sit * 0.4;
  const legH = legHBase * (1 - lie * 0.72);
  const legHTras = legHBase * (1 - sit * 0.55) * (1 - lie * 0.75);
  const sitDrop = sit * 0.22 * torsoH;

  const torsoBottom = GROUND_Y - legH;
  const torsoTop = torsoBottom - torsoH;
  const torsoBottomTras = GROUND_Y - legHTras;
  const torsoTopTras = torsoTop + sitDrop;

  const anchoTotal = torsoLen + headR * 1.5 + muzLen;
  const rumpX = 100 - anchoTotal / 2 + headR * 0.25;
  const chestX = rumpX + torsoLen;
  // Ancla del tramo trasero (grupa, patas traseras, cola): se acerca al
  // pecho con `tuck` en vez de quedarse en `rumpX` de "parado".
  const rumpXAnclado = rumpX + (chestX - rumpX) * tuck;

  const headCx = chestX + headR * 0.16;
  const headCy = torsoTop - headR * 0.36;

  // Lomo: los gatos lo tienen arqueado, los perros más recto.
  const arco = esGato ? -torsoH * 0.1 : torsoH * 0.04;
  const panza = torsoH * (0.06 + (b.bodyWidth - 1) * 0.42);

  // Estilo plano tipo ilustración vectorial: casi sin degradé (antes era muy
  // "peluche 3D") y un trazo grueso de tinta oscura fija, no un tono más
  // oscuro del pelo — así el contorno se lee igual de firme en un gato
  // blanco que en uno negro, como en las referencias de estilo.
  const dark = shade(b.base, -14);
  const darker = shade(b.base, -30);
  const light = shade(b.base, 10);
  const contorno = shade(b.base, -72);
  const ink = '#2E2620';
  const trazo = 2.4 * S;

  // ------------------------------------------------------- silueta del torso
  // El lomo entre el hombro (altura fija) y la grupa (baja `sitDrop` entera
  // al sentarse) se reparte en rampa — antes esos dos puntos intermedios se
  // quedaban a la altura de "parado" y saltaban de golpe al punto de la
  // grupa ya sentada, y el Catmull-Rom de `curvaCerrada` leía ese escalón
  // como un quiebre de columna en vez de una curva continua.
  const torso: Pt[] = [
    // Cruz y hombro: sin este par el frente quedaba como una pared vertical.
    [chestX - torsoLen * 0.12, torsoTop - torsoH * 0.06],
    [chestX - torsoLen * 0.34, torsoTop + arco * 0.5 + sitDrop * 0.12],
    [chestX - torsoLen * 0.62, torsoTop + arco + sitDrop * 0.45],
    [rumpXAnclado + torsoLen * 0.05, torsoTopTras + torsoH * 0.08],
    [rumpXAnclado - torsoH * 0.12, torsoTopTras + torsoH * 0.5],
    [rumpXAnclado + torsoH * 0.2, torsoBottomTras],
    [chestX - torsoLen * 0.46, torsoBottom + panza],
    [chestX - torsoH * 0.12, torsoBottom - torsoH * 0.02],
    // Pecho: sale hacia adelante y hacia arriba, marcando el pectoral.
    [chestX + torsoH * 0.3, torsoBottom - torsoH * 0.42],
    [chestX + torsoH * 0.26, torsoTop + torsoH * 0.34],
  ];

  // Cuello: une el pecho con la base del cráneo. Sin esto la cabeza parecía
  // pegada encima del lomo, con un escalón entre las dos siluetas.
  const cuello: Pt[] = [
    [chestX - torsoH * 0.05, torsoTop + torsoH * 0.1],
    [headCx - headR * 0.62, headCy + headR * 0.35],
    [headCx + headR * 0.2, headCy + headR * 0.82],
    [chestX + torsoH * 0.26, torsoTop + torsoH * 0.42],
  ];

  // ------------------------------------------------------- silueta de cabeza
  const nx = headCx + headR * 0.55 + muzLen;
  const cabeza: Pt[] = esGato
    ? [
        [headCx - headR * 0.06, headCy - headR * 1.02],
        [headCx + headR * 0.55, headCy - headR * 0.78],
        [headCx + headR * 0.7, headCy - headR * 0.12],
        [nx - muzLen * 0.4, headCy + muzDrop * 0.5],
        [nx, headCy + muzDrop],
        [nx - muzLen * 0.06 - headR * 0.05, headCy + muzDrop + headR * 0.28],
        [headCx + headR * 0.5, headCy + headR * 0.62],
        [headCx - headR * 0.1, headCy + headR * 0.86],
        [headCx - headR * 0.8, headCy + headR * 0.5],
        [headCx - headR * 1.0, headCy - headR * 0.2],
        [headCx - headR * 0.7, headCy - headR * 0.82],
      ]
    : [
        [headCx - headR * 0.05, headCy - headR * 1.0],
        [headCx + headR * 0.6, headCy - headR * 0.74],
        [headCx + headR * 0.74, headCy - headR * 0.1],
        [headCx + headR * 0.55 + muzLen * 0.55, headCy - headR * 0.02 + muzDrop * 0.5],
        [nx, headCy + muzDrop],
        [nx - muzLen * 0.08, headCy + muzDrop + headR * 0.27],
        [headCx + headR * 0.42 + muzLen * 0.5, headCy + muzDrop + headR * 0.36],
        [headCx + headR * 0.3, headCy + headR * 0.64],
        [headCx - headR * 0.2, headCy + headR * 0.94],
        [headCx - headR * 0.78, headCy + headR * 0.56],
        [headCx - headR * 1.0, headCy - headR * 0.18],
        [headCx - headR * 0.72, headCy - headR * 0.8],
      ];

  const grosorPata = (5.4 + b.bodyWidth * 1.8) * S;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={id('panza')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={b.belly} stopOpacity="0" />
          <Stop offset="60%" stopColor={b.belly} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={b.belly} stopOpacity="1" />
        </LinearGradient>
        <ClipPath id={id('clipTorso')}>
          <Path d={curvaCerrada(torso)} />
        </ClipPath>
        <ClipPath id={id('clipCabeza')}>
          <Path d={curvaCerrada(cabeza)} />
        </ClipPath>
      </Defs>

      {/* Margen interno: cola / saltos / stretch no tocan el borde del stage. */}
      <G transform={`translate(100 ${GROUND_Y}) scale(${PET_FIT}) translate(-100 ${-GROUND_Y})`}>
      {/* Sombra en el piso: no acompaña el salto, se achica. */}
      <Sombra pose={pose} rumpX={rumpX} chestX={chestX} S={S} />

      <G
        transform={
          `translate(${100 + pose.bodyX * facing} ${torsoTop + pose.bodyY}) ` +
          `scale(${facing} 1) ` +
          `rotate(${pose.bodyRot}) ` +
          `scale(${pose.bodyScaleX * (1 + squash * 0.08 - stretch * 0.05)} ${
            pose.bodyScaleY * (1 - squash * 0.1 + stretch * 0.07)
          }) ` +
          `translate(${-100} ${-torsoTop})`
        }
      >
        {/* ---------- patas del lado lejano (más oscuras, detrás) ---------- */}
        <G opacity={0.72}>
          {pataTrasera(rumpXAnclado - 3 * S, torsoBottomTras, GROUND_Y, torsoH, legHTras, grosorPata, darker, sit)}
          {pataDelantera(chestX - torsoH * 0.34, torsoBottom, GROUND_Y, legH, grosorPata, darker, 0)}
        </G>

        {/* ---------- cola (detrás del cuerpo) ---------- */}
        <Cola b={b} rumpX={rumpXAnclado} y={torsoTopTras + torsoH * 0.18} S={S} pose={pose} clock={clock} />

        {/* ---------- cuello (debajo del torso y la cabeza) ---------- */}
        <Path d={curvaCerrada(cuello)} fill={b.pattern === 'colorpoint' ? shade(b.base, -8) : b.base} />

        {/* ---------- torso ---------- */}
        <Path d={curvaCerrada(torso)} fill={b.base} stroke={ink} strokeWidth={trazo} strokeLinejoin="round" />
        <G clipPath={`url(#${id('clipTorso')})`}>
          {/* Panza clara */}
          <Rect
            x={rumpX - 20}
            y={torsoBottom - torsoH * 0.5}
            width={torsoLen + 60}
            height={torsoH * 1.2}
            fill={`url(#${id('panza')})`}
          />
          {patronTorso(b, rumpX, chestX, torsoTop, torsoBottom, torsoH, S)}
        </G>
        {b.fluff > 0.55 ? (
          <Melena chestX={chestX} torsoTop={torsoTop} torsoH={torsoH} fluff={b.fluff} color={light} S={S} />
        ) : null}

        {/* ---------- patas del lado cercano ---------- */}
        {pataTrasera(rumpXAnclado + 3 * S, torsoBottomTras, GROUND_Y, torsoH, legHTras, grosorPata, colorPata(b, dark), sit)}
        {pataDelantera(chestX - torsoH * 0.08, torsoBottom, GROUND_Y, legH, grosorPata, colorPata(b, b.base), pose.pawLift)}

        {/* ---------- cabeza ---------- */}
        <G
          transform={
            `translate(${headCx + pose.headX + lookX * 2.5} ${headCy + pose.headY + lookY * 2}) ` +
            `rotate(${pose.headRot + lookX * 5}) translate(${-headCx} ${-headCy})`
          }
        >
          {/* Oreja lejana, detrás del cráneo */}
          <G opacity={0.62}>
            {oreja(b, headCx - headR * 0.66, headCy - headR * 0.52, headR, pose.earFlap, -1, darker)}
          </G>

          <Path d={curvaCerrada(cabeza)} fill={b.base} stroke={ink} strokeWidth={trazo} strokeLinejoin="round" />
          <G clipPath={`url(#${id('clipCabeza')})`}>
            {patronCabeza(b, headCx, headCy, headR, muzLen, muzDrop)}
          </G>

          <Cara
            b={b}
            headCx={headCx}
            headCy={headCy}
            headR={headR}
            muzLen={muzLen}
            muzDrop={muzDrop}
            pose={pose}
            lookX={lookX}
            lookY={lookY}
            contorno={contorno}
          />

          {/* Oreja cercana */}
          {oreja(b, headCx - headR * 0.26, headCy - headR * 0.6, headR, pose.earFlap, 1, b.pattern === 'colorpoint' || b.pattern === 'mascara' ? b.accent : b.base)}
        </G>
      </G>

      {pose.prop ? (
        <Utileria prop={pose.prop} t={pose.propT} nx={nx} ny={headCy + muzDrop} headR={headR} S={S} clock={clock} />
      ) : null}
      </G>
    </Svg>
  );
}

/* =======================================================================
 * Suavizado: convierte una lista de puntos anatómicos en una curva cerrada.
 * Catmull-Rom → Bézier. Hacer esto a mano con puntos de control era la
 * causa de que las siluetas salieran quebradas y "deformadas".
 * ===================================================================== */
function curvaCerrada(p: Pt[], tension = 1): string {
  const n = p.length;
  if (n < 3) return '';
  const at = (i: number) => p[((i % n) + n) % n]!;
  let d = `M${p[0]![0].toFixed(2)} ${p[0]![1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

function colorPata(b: ResolvedBreed, fallback: string): string {
  // En colorpoint (siamés, himalayo, ragdoll) las patas van oscuras.
  return b.pattern === 'colorpoint' ? b.accent : fallback;
}

/* ------------------------------------------------------------------ patas */
/** Pata delantera: casi recta, con codo apenas marcado. */
function pataDelantera(
  x: number,
  top: number,
  ground: number,
  legH: number,
  grosor: number,
  color: string,
  lift: number
) {
  const alzado = lift * legH * 0.8;
  const pie = ground - alzado;
  const codo: Pt = [x + grosor * 0.15, top + legH * 0.42];
  const rot = lift * -34;
  const d = `M${x} ${top - grosor * 0.4} Q${codo[0]} ${codo[1]}, ${x + grosor * 0.05} ${pie - grosor * 0.35}`;
  return (
    <G transform={`rotate(${rot} ${x} ${top})`}>
      <Path d={d} stroke={INK} strokeWidth={grosor + grosor * 0.34} strokeLinecap="round" fill="none" />
      <Path d={d} stroke={color} strokeWidth={grosor} strokeLinecap="round" fill="none" />
      <Pata cx={x + grosor * 0.05} cy={pie} grosor={grosor} color={shade(color, -14)} />
    </G>
  );
}

/**
 * Pata trasera con corvejón: cadera → rodilla adelante → corvejón atrás → pie.
 * Ese zigzag es la señal más fuerte de "esto es un cuadrúpedo".
 */
function pataTrasera(
  x: number,
  top: number,
  ground: number,
  torsoH: number,
  legH: number,
  grosor: number,
  color: string,
  sit: number
) {
  const cadera: Pt = [x + torsoH * 0.22, top - torsoH * 0.22];
  const rodilla: Pt = [x + torsoH * 0.46 + sit * torsoH * 0.2, top + legH * 0.34];
  const corvejon: Pt = [x + torsoH * 0.06 - sit * torsoH * 0.15, top + legH * 0.68];
  const pie: Pt = [x + torsoH * 0.3, ground];
  const dMuslo = `M${cadera[0]} ${cadera[1]} Q${rodilla[0] + grosor * 0.3} ${rodilla[1] - legH * 0.1}, ${rodilla[0]} ${rodilla[1]}`;
  const dCana = `M${rodilla[0]} ${rodilla[1]} L${corvejon[0]} ${corvejon[1]} L${pie[0]} ${pie[1] - grosor * 0.35}`;
  return (
    <G>
      {/* Contorno de tinta detrás, para las dos partes de la pata. */}
      <Path d={dMuslo} stroke={INK} strokeWidth={grosor * 1.55 + grosor * 0.3} strokeLinecap="round" fill="none" />
      <Path d={dCana} stroke={INK} strokeWidth={grosor + grosor * 0.34} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Muslo: más ancho que la caña */}
      <Path d={dMuslo} stroke={color} strokeWidth={grosor * 1.55} strokeLinecap="round" fill="none" />
      <Path d={dCana} stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Pata cx={pie[0]} cy={pie[1]} grosor={grosor} color={shade(color, -14)} />
    </G>
  );
}

/** Pie con dedos marcados: sin esto la pata termina en un palo. */
function Pata({ cx, cy, grosor, color }: { cx: number; cy: number; grosor: number; color: string }) {
  const w = grosor * 1.15;
  return (
    <G>
      <Path
        d={`M${cx - w * 0.75} ${cy} Q${cx - w * 0.8} ${cy - grosor * 0.75}, ${cx + w * 0.35} ${cy - grosor * 0.7} Q${cx + w * 0.95} ${cy - grosor * 0.6}, ${cx + w * 0.9} ${cy} Z`}
        fill={color}
        stroke={INK}
        strokeWidth={grosor * 0.22}
        strokeLinejoin="round"
      />
      <Path
        d={`M${cx - w * 0.3} ${cy} l0 ${-grosor * 0.34} M${cx + w * 0.22} ${cy} l0 ${-grosor * 0.34}`}
        stroke={shade(color, -22)}
        strokeWidth={grosor * 0.14}
        strokeLinecap="round"
      />
    </G>
  );
}

/* ------------------------------------------------------------------- cola */
function Cola({
  b,
  rumpX,
  y,
  S,
  pose,
  clock,
}: {
  b: ResolvedBreed;
  rumpX: number;
  y: number;
  S: number;
  pose: Pose;
  clock: number;
}) {
  const color = b.pattern === 'colorpoint' ? b.accent : b.base;
  if (b.tailLength < 0.18) {
    return <Ellipse cx={rumpX + 1} cy={y + 2} rx={5 * S} ry={4.4 * S} fill={shade(color, -20)} />;
  }
  const len = 26 * b.tailLength * S;
  const base = (5.5 + 7 * b.tailFluff) * S;
  const punta = (1.8 + 5.5 * b.tailFluff) * S;
  const wag = Math.sin(clock * 6 * Math.max(0.2, pose.tailWag)) * (6 + 12 * Math.min(2, pose.tailWag));
  // Los gatos la llevan alta y curva; los perros más tendida — pero sin
  // salirse del margen izquierdo (antes se cortaba contra el stage).
  const alta = b.species === 'gato';
  const x0 = rumpX + 2;
  const cx1 = rumpX - len * (alta ? 0.12 : 0.28);
  const cy1 = y - len * (alta ? 0.52 : 0.32);
  // Sentado o acostado: la cola se enrosca al piso junto a la cadera en vez
  // de seguir el arco de "parado" — si no, quedaba estirada de punta hacia
  // donde estaban las patas antes de encogerse, y con el lomo ya más abajo
  // se leía como cortada contra el cuerpo.
  const tuck = Math.max(pose.sit, pose.lie ?? 0);
  const txStand = rumpX + len * (alta ? 0.1 : -0.42);
  const tyStand = y - len * (alta ? 0.88 : 0.5);
  const tx = txStand + (rumpX + len * 0.22 - txStand) * tuck;
  const ty = tyStand + (y + len * 0.3 - tyStand) * tuck;

  // Silueta cónica en vez de un trazo de grosor fijo: una cola de espesor
  // constante se veía como una varilla clavada en la grupa.
  const d =
    `M${x0} ${y - base * 0.5} ` +
    `Q${cx1 + base * 0.35} ${cy1 - base * 0.2}, ${tx + punta * 0.4} ${ty - punta * 0.5} ` +
    `Q${tx + punta * 0.9} ${ty + punta * 0.6}, ${tx - punta * 0.5} ${ty + punta * 0.6} ` +
    `Q${cx1 - base * 0.45} ${cy1 + base * 0.5}, ${x0} ${y + base * 0.55} Z`;

  return (
    <G transform={`rotate(${wag} ${x0} ${y})`}>
      {/* Base redondeada: funde el arranque de la cola con la grupa. */}
      <Ellipse cx={x0 + base * 0.2} cy={y} rx={base * 0.75} ry={base * 0.62} fill={color} stroke={INK} strokeWidth={S * 1.6} />
      <Path d={d} fill={color} stroke={INK} strokeWidth={S * 1.9} strokeLinejoin="round" />
      {b.tailFluff > 0.7 ? (
        <Ellipse cx={tx} cy={ty} rx={punta * 1.05} ry={punta * 1.25} fill={shade(color, 14)} />
      ) : null}
      {b.pattern === 'rayado'
        ? [0.42, 0.72].map((f, i) => (
            <Ellipse
              key={i}
              cx={x0 + (tx - x0) * f}
              cy={y + (ty - y) * f}
              rx={(base + (punta - base) * f) * 0.52}
              ry={(base + (punta - base) * f) * 0.34}
              fill={b.accent}
              opacity={0.8}
            />
          ))
        : null}
    </G>
  );
}

/* ----------------------------------------------------------------- orejas */
function oreja(
  b: ResolvedBreed,
  bx: number,
  by: number,
  headR: number,
  flap: number,
  lado: 1 | -1,
  color: string
) {
  if (b.earSize <= 0.01) return null;
  const e = b.earSize;
  const rot = flap * lado * 0.8;
  const borde = '#2E2620';
  const grosorTrazo = headR * 0.09;
  let pts: Pt[];

  // Las orejas puntiagudas van como polígono, sin suavizar: al pasarlas por
  // `curvaCerrada` la punta se redondeaba y quedaban como globos en vez de
  // orejas de gato o de pastor.
  const triangulo = (alto: number, ancho: number, interior: boolean) => {
    const x0 = bx - headR * ancho * 0.42;
    const x1 = bx + headR * ancho * 0.58;
    const tip = bx + headR * ancho * 0.06;
    // Punta con un pelín de curva en vez de un vértice matemático — en la
    // referencia la oreja no termina en una aguja perfecta.
    const tipY = by - headR * alto;
    const tipL: Pt = [tip - headR * ancho * 0.05, tipY + headR * 0.05];
    const tipR: Pt = [tip + headR * ancho * 0.05, tipY + headR * 0.05];
    return (
      <G transform={`rotate(${rot} ${bx} ${by})`}>
        <Path
          d={`M${x0} ${by + headR * 0.26} L${tipL[0]} ${tipL[1]} Q${tip} ${tipY - headR * 0.03}, ${tipR[0]} ${tipR[1]} L${x1} ${by + headR * 0.18} Z`}
          fill={color}
          stroke={borde}
          strokeWidth={grosorTrazo}
          strokeLinejoin="round"
        />
        {interior ? (
          <Path
            d={`M${x0 + headR * 0.16} ${by + headR * 0.18} L${tip} ${by - headR * (alto - 0.22)} L${x1 - headR * 0.14} ${by + headR * 0.12} Z`}
            fill={shade(color, -30)}
            opacity={0.6}
            strokeLinejoin="round"
          />
        ) : null}
      </G>
    );
  };

  switch (b.earStyle) {
    case 'triangulo': // gato
      return triangulo(0.62 * e, 0.9, true);
    case 'erecta_punta':
      return triangulo(0.7 * e, 0.86, false);
    case 'larga_conejo': {
      // Orejas bien largas y redondeadas, inclinadas hacia afuera cada una
      // para su lado — así se separan y se leen como dos orejas de
      // verdad en vez de fundirse en una sola punta (lo que pasaba con
      // `erecta_punta` a este tamaño: dos triángulos flacos y altos, casi
      // pegados, leían como un cuerno único).
      const largo = headR * (1.35 + 0.85 * e);
      const anchoBase = headR * 0.42;
      const anchoMedio = headR * 0.3;
      const leanExtra = lado * 15;
      const pinna: Pt[] = [
        [bx - anchoBase * 0.5, by + headR * 0.12],
        [bx - anchoMedio * 0.5, by - largo * 0.55],
        [bx, by - largo],
        [bx + anchoMedio * 0.5, by - largo * 0.55],
        [bx + anchoBase * 0.5, by + headR * 0.12],
      ];
      const interior: Pt[] = [
        [bx - anchoBase * 0.26, by + headR * 0.02],
        [bx - anchoMedio * 0.26, by - largo * 0.52],
        [bx, by - largo * 0.92],
        [bx + anchoMedio * 0.26, by - largo * 0.52],
        [bx + anchoBase * 0.26, by + headR * 0.02],
      ];
      return (
        <G transform={`rotate(${rot + leanExtra} ${bx} ${by})`}>
          <Path d={curvaCerrada(pinna)} fill={color} stroke={borde} strokeWidth={grosorTrazo} strokeLinejoin="round" />
          <Path d={curvaCerrada(interior)} fill="#E8A0B0" opacity={0.65} />
        </G>
      );
    }
    case 'erecta_redonda':
      return (
        <G transform={`rotate(${rot} ${bx} ${by})`}>
          <Ellipse
            cx={bx + headR * 0.06}
            cy={by - headR * 0.36 * e}
            rx={headR * 0.36 * e}
            ry={headR * 0.6 * e}
            fill={color}
            stroke={borde}
            strokeWidth={grosorTrazo}
          />
          <Ellipse cx={bx + headR * 0.06} cy={by - headR * 0.34 * e} rx={headR * 0.2 * e} ry={headR * 0.38 * e} fill={shade(color, -28)} opacity={0.55} />
        </G>
      );
    case 'semi':
      pts = [
        [bx - headR * 0.24, by + headR * 0.3],
        [bx + headR * 0.1, by - headR * 0.62 * e],
        [bx + headR * 0.52, by - headR * 0.02],
        [bx + headR * 0.3, by + headR * 0.3],
      ];
      break;
    case 'caida':
    default:
      // Cae por el costado del cráneo, no flota al lado.
      pts = [
        [bx - headR * 0.16, by + headR * 0.1],
        [bx - headR * 0.5, by + headR * 0.5 * e],
        [bx - headR * 0.42, by + headR * 1.25 * e],
        [bx + headR * 0.05, by + headR * 1.0 * e],
        [bx + headR * 0.18, by + headR * 0.28],
      ];
      break;
  }

  return (
    <G transform={`rotate(${rot} ${bx} ${by})`}>
      <Path d={curvaCerrada(pts)} fill={color} stroke={borde} strokeWidth={grosorTrazo} strokeLinejoin="round" />
    </G>
  );
}

/* ------------------------------------------------------------------- cara */
function Cara({
  b,
  headCx,
  headCy,
  headR,
  muzLen,
  muzDrop,
  pose,
  lookX,
  lookY,
  contorno,
}: {
  b: ResolvedBreed;
  headCx: number;
  headCy: number;
  headR: number;
  muzLen: number;
  muzDrop: number;
  pose: Pose;
  lookX: number;
  lookY: number;
  contorno: string;
}) {
  const nx = headCx + headR * 0.55 + muzLen;
  const ny = headCy + muzDrop;
  const abierta = pose.mouthOpen;
  const abierto = 1 - pose.eyeClose;

  // Ojo único visible (perfil). El lejano se insinúa sólo con la ceja.
  // La posición depende del hocico: en un chato (gato, pug) el ojo tiene que
  // quedar sobre el cráneo, no encima de la nariz, que es como quedaba antes.
  const ex = headCx + headR * (0.13 + 0.24 * b.snoutLength);
  const ey = headCy - headR * 0.16;
  // Ojo grande: es el rasgo que más "tierno" lee en un dibujo para chicos —
  // antes era chico (0.2-0.23) y el bicho leía más "de verdad" que de
  // personaje. Con esto ocupa buena parte de la cara, como en las
  // referencias de estilo (@kevinfm_art / Faith&Freedom).
  const eR = headR * (b.snoutLength < 0.2 ? 0.32 : 0.28);
  const px = ex + lookX * eR * 0.4;
  const py = ey + lookY * eR * 0.32;

  return (
    <>
      {/* Hocico: mancha algo más clara sobre el morro */}
      {b.snoutLength > 0.25 ? (
        <Ellipse
          cx={nx - muzLen * 0.42}
          cy={ny + headR * 0.04}
          rx={muzLen * 0.6}
          ry={headR * 0.3}
          fill={shade(b.base, 20)}
          opacity={0.5}
        />
      ) : null}

      {/* Boca */}
      {abierta > 0.05 ? (
        <Path
          d={`M${nx - headR * 0.06} ${ny + headR * 0.2} Q${nx - muzLen * 0.5 - headR * 0.1} ${ny + headR * (0.34 + abierta * 0.95)}, ${headCx + headR * 0.26} ${ny + headR * 0.28}`}
          fill="#5A2028"
          stroke="none"
        />
      ) : null}
      <Path
        d={`M${nx - headR * 0.04} ${ny + headR * 0.22} Q${nx - muzLen * 0.45} ${ny + headR * 0.36}, ${headCx + headR * 0.34} ${ny + headR * 0.26}`}
        stroke={INK}
        strokeWidth={headR * 0.05}
        fill="none"
        strokeLinecap="round"
      />
      {abierta > 0.35 ? (
        <Ellipse
          cx={nx - muzLen * 0.42 - headR * 0.08}
          cy={ny + headR * (0.3 + abierta * 0.5)}
          rx={headR * 0.16}
          ry={headR * abierta * 0.3}
          fill="#E2758A"
        />
      ) : null}

      {/* Nariz sobre la punta del morro */}
      <Ellipse
        cx={nx - headR * 0.05}
        cy={ny - headR * 0.02}
        rx={headR * 0.17}
        ry={headR * 0.14}
        fill={b.nose}
        stroke={INK}
        strokeWidth={headR * 0.045}
      />
      <Ellipse cx={nx - headR * 0.09} cy={ny - headR * 0.06} rx={headR * 0.05} ry={headR * 0.035} fill="#FFFFFF" opacity={0.6} />

      {/* Bigotes */}
      {b.species === 'gato'
        ? [0, 1, 2].map((i) => (
            <Path
              key={i}
              d={`M${nx - headR * 0.22} ${ny + headR * (0.02 + i * 0.09)} L${nx + headR * (0.5 - i * 0.05)} ${ny + headR * (i * 0.16 - 0.14)}`}
              stroke="#FFFFFF"
              strokeOpacity={0.55}
              strokeWidth={headR * 0.032}
            />
          ))
        : null}

      {/* Ceja (marca de fuego en tricolor, o sombra suave) */}
      <Ellipse
        cx={ex + headR * 0.02}
        cy={ey - eR * 1.45}
        rx={eR * 0.72}
        ry={eR * 0.3}
        fill={b.pattern === 'tricolor' ? b.accent : contorno}
        opacity={b.pattern === 'tricolor' ? 0.9 : 0.22}
      />

      {/* Ojo */}
      {abierto < 0.14 ? (
        <Path
          d={`M${ex - eR * 0.9} ${ey} Q${ex} ${ey + eR * 0.8}, ${ex + eR * 0.9} ${ey}`}
          stroke="#241F1E"
          strokeWidth={headR * 0.085}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <G>
          <Ellipse cx={ex} cy={ey} rx={eR} ry={eR * abierto} fill="#FFFDF8" stroke={INK} strokeWidth={headR * 0.05} />
          <Circle cx={px} cy={py} r={eR * 0.66 * abierto + eR * 0.1} fill={b.eye} />
          {/* Pupila redonda y grande para los dos — más tierna que la rendija
              felina real, que en este dibujo (pensado para chicos) leía duro. */}
          <Circle cx={px} cy={py} r={eR * 0.4 * abierto + eR * 0.08} fill="#141110" />
          {/* Brillos: uno grande arriba-izquierda y uno chico abajo-derecha —
              es lo que hace que el ojo lea "vivo" en vez de una bolita plana. */}
          <Circle cx={px - eR * 0.28} cy={py - eR * 0.32} r={eR * 0.24} fill="#FFFFFF" />
          <Circle cx={px + eR * 0.22} cy={py + eR * 0.24} r={eR * 0.1} fill="#FFFFFF" opacity={0.85} />
          {/* Párpado superior: un trazo curvo marcado, no sólo el borde del óvalo. */}
          <Path
            d={`M${ex - eR * 0.95} ${ey - eR * 0.12} Q${ex} ${ey - eR * (1.05 * abierto)}, ${ex + eR * 0.95} ${ey - eR * 0.16}`}
            stroke={INK}
            strokeWidth={headR * 0.045}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      )}
    </>
  );
}

/* --------------------------------------------------------------- patrones */
function patronTorso(
  b: ResolvedBreed,
  rumpX: number,
  chestX: number,
  torsoTop: number,
  torsoBottom: number,
  torsoH: number,
  S: number
) {
  const w = chestX - rumpX;
  const midY = (torsoTop + torsoBottom) / 2;
  switch (b.pattern) {
    case 'rayado':
      return [0.18, 0.33, 0.48, 0.63, 0.78, 0.9].map((f, i) => (
        <Path
          key={i}
          d={`M${rumpX + w * f} ${torsoTop - 4} Q${rumpX + w * f + 7} ${midY}, ${rumpX + w * f - 2} ${torsoBottom + 6}`}
          stroke={b.accent}
          strokeWidth={4.6 * S}
          opacity={0.92}
          fill="none"
        />
      ));
    case 'manchado':
      return [
        [0.22, -0.34, 0.3], [0.44, 0.22, 0.24], [0.66, -0.26, 0.27], [0.84, 0.24, 0.2],
      ].map(([fx, fy, r], i) => (
        <Ellipse
          key={i}
          cx={rumpX + w * (fx as number)}
          cy={midY + torsoH * (fy as number)}
          rx={torsoH * (r as number)}
          ry={torsoH * (r as number) * 0.82}
          fill={b.accent}
          opacity={0.82}
        />
      ));
    case 'bicolor':
      return <Ellipse cx={rumpX + w * 0.3} cy={midY - torsoH * 0.1} rx={w * 0.32} ry={torsoH * 0.72} fill={b.accent} opacity={0.85} />;
    case 'tricolor':
      // Manto oscuro sobre el lomo.
      return <Ellipse cx={rumpX + w * 0.48} cy={torsoTop + torsoH * 0.12} rx={w * 0.46} ry={torsoH * 0.62} fill={b.accent} opacity={0.9} />;
    case 'mascara':
      return <Ellipse cx={rumpX + w * 0.46} cy={torsoTop + torsoH * 0.06} rx={w * 0.46} ry={torsoH * 0.58} fill={b.accent} opacity={0.5} />;
    case 'colorpoint':
      return <Ellipse cx={rumpX + w * 0.06} cy={midY + torsoH * 0.3} rx={w * 0.14} ry={torsoH * 0.5} fill={b.accent} opacity={0.4} />;
    default:
      return null;
  }
}

function patronCabeza(b: ResolvedBreed, cx: number, cy: number, r: number, muzLen: number, muzDrop: number) {
  switch (b.pattern) {
    case 'mascara':
      return <Ellipse cx={cx - r * 0.1} cy={cy - r * 0.62} rx={r * 1.0} ry={r * 0.6} fill={b.accent} opacity={0.72} />;
    case 'colorpoint':
      return <Ellipse cx={cx + r * 0.5 + muzLen * 0.4} cy={cy + muzDrop * 0.6} rx={r * 0.75} ry={r * 0.6} fill={b.accent} opacity={0.5} />;
    case 'rayado':
      return [-0.35, 0, 0.35].map((f, i) => (
        <Path key={i} d={`M${cx + r * f} ${cy - r * 1.05} L${cx + r * f * 0.55} ${cy - r * 0.38}`} stroke={b.accent} strokeWidth={r * 0.15} opacity={0.7} />
      ));
    case 'manchado':
      return <Ellipse cx={cx - r * 0.45} cy={cy - r * 0.2} rx={r * 0.36} ry={r * 0.32} fill={b.accent} opacity={0.8} />;
    case 'bicolor':
      return <Ellipse cx={cx - r * 0.55} cy={cy - r * 0.3} rx={r * 0.48} ry={r * 0.6} fill={b.accent} opacity={0.8} />;
    default:
      return null;
  }
}

function Melena({
  chestX, torsoTop, torsoH, fluff, color, S,
}: { chestX: number; torsoTop: number; torsoH: number; fluff: number; color: string; S: number }) {
  const n = 6;
  const r = (3.4 + 4.2 * fluff) * S;
  return (
    <G opacity={0.8}>
      {Array.from({ length: n }, (_, i) => {
        const ang = Math.PI * (-0.35 + (i / (n - 1)) * 0.95);
        return (
          <Circle
            key={i}
            cx={chestX + Math.cos(ang) * torsoH * 0.42}
            cy={torsoTop + torsoH * 0.4 + Math.sin(ang) * torsoH * 0.52}
            r={r}
            fill={color}
          />
        );
      })}
    </G>
  );
}

function Sombra({ pose, rumpX, chestX, S }: { pose: Pose; rumpX: number; chestX: number; S: number }) {
  const air = Math.max(0, -pose.bodyY);
  const k = Math.max(0.45, 1 - air / 60);
  return (
    <Ellipse
      cx={(rumpX + chestX) / 2 + pose.bodyX * 0.3}
      cy={GROUND_Y + 4}
      rx={((chestX - rumpX) / 2 + 10 * S) * k}
      ry={5.2 * S * k}
      fill="#101010"
      opacity={0.26 * k}
    />
  );
}

/* ---------------------------------------------------------------- tortuga */
function Tortuga({
  size, breed, pose, uid, facing, lookX,
}: { size: number; breed: ResolvedBreed; pose: Pose; uid: string; facing: 1 | -1; lookX: number }) {
  const b = breed;
  const S = b.scale;
  const cx = 100;
  const cy = GROUND_Y - 16 * S;
  const rx = 40 * S;
  const ry = 26 * S;
  const dark = shade(b.base, -34);
  const light = shade(b.base, 28);
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`caparazon_${uid}`} cx="36%" cy="26%" r="76%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="60%" stopColor={b.base} />
          <Stop offset="100%" stopColor={dark} />
        </RadialGradient>
      </Defs>
      <G transform={`translate(100 ${GROUND_Y}) scale(${PET_FIT}) translate(-100 ${-GROUND_Y})`}>
      <Ellipse cx={cx} cy={GROUND_Y + 3} rx={rx * 1.05} ry={5 * S} fill="#101010" opacity={0.24} />
      <G transform={`translate(${100 + pose.bodyX * facing} ${pose.bodyY}) scale(${facing} 1) translate(${-100} 0)`}>
        {/* Patas */}
        {[-0.72, -0.3, 0.3, 0.72].map((f, i) => (
          <Ellipse key={i} cx={cx + rx * f} cy={GROUND_Y - 5 * S} rx={8 * S} ry={5.4 * S} fill={dark} />
        ))}
        {/* Cuello y cabeza */}
        <Path d={`M${cx + rx * 0.72} ${cy} Q${cx + rx * 1.05} ${cy - ry * 0.2}, ${cx + rx * 1.18} ${cy - ry * 0.55}`} stroke={shade(b.base, 12)} strokeWidth={13 * S} strokeLinecap="round" fill="none" />
        <Circle cx={cx + rx * 1.22} cy={cy - ry * 0.62} r={11 * S} fill={shade(b.base, 16)} />
        <Circle cx={cx + rx * 1.3 + lookX} cy={cy - ry * 0.78} r={2.1 * S} fill="#1C1A19" />
        {/* Caparazón */}
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#caparazon_${uid})`} stroke={shade(b.base, -60)} strokeWidth={1.4 * S} strokeOpacity={0.5} />
        <Ellipse cx={cx} cy={cy + ry * 0.1} rx={rx * 0.66} ry={ry * 0.6} fill={dark} opacity={0.3} />
        {[[-0.4, -0.18], [0, -0.3], [0.4, -0.18], [-0.22, 0.22], [0.22, 0.22]].map(([fx, fy], i) => (
          <Ellipse key={i} cx={cx + rx * (fx as number)} cy={cy + ry * (fy as number)} rx={rx * 0.15} ry={ry * 0.19} fill={b.accent} opacity={0.5} />
        ))}
      </G>
      </G>
    </Svg>
  );
}

/**
 * Pajarito redondo y amistoso, parado en una ramita. No tiene patas de
 * mamífero ni orejas — el `Pose` genérico se reinterpreta: `earFlap` bate
 * las alas, `pawLift` alza una patita (como mirando para el costado),
 * `sit`/`lie` lo agachan sobre la ramita, `tailWag` abre el abanico de
 * plumas de la cola.
 */
function Ave({
  size, breed, pose, uid, facing, lookX, lookY, clock,
}: { size: number; breed: ResolvedBreed; pose: Pose; uid: string; facing: 1 | -1; lookX: number; lookY: number; clock: number }) {
  const b = breed;
  const S = b.scale;
  const dark = shade(b.base, -34);
  const light = shade(b.base, 26);
  const contorno = shade(b.base, -60);
  const cx = 100 + pose.bodyX * facing;
  const bodyR = 30 * b.bodyWidth * S;
  const agachado = (pose.sit + pose.lie) * 0.4;
  const cy = GROUND_Y - bodyR * (0.92 - agachado * 0.35) + pose.bodyY;
  const headR = 17 * b.headSize * S;
  const headCx = cx + (bodyR + headR * 0.3) * facing;
  const headCy = cy - bodyR * 0.7 + pose.headY;
  const beakLen = headR * (0.5 + b.snoutLength);
  const abierta = pose.mouthOpen;
  const eyeOpen = 1 - pose.eyeClose;
  const wing = pose.earFlap; // reusa el campo: bate las alas.
  const bob = Math.sin(clock * 1.6) * 1.4 * S;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`aveCuerpo_${uid}`} cx="36%" cy="26%" r="80%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="60%" stopColor={b.base} />
          <Stop offset="100%" stopColor={dark} />
        </RadialGradient>
      </Defs>
      <G transform={`translate(100 ${GROUND_Y}) scale(${PET_FIT}) translate(-100 ${-GROUND_Y})`}>
        {/* Ramita */}
        <Path d={`M${cx - 42 * S} ${GROUND_Y + 2} Q${cx} ${GROUND_Y - 3}, ${cx + 42 * S} ${GROUND_Y + 2}`} stroke="#8A6440" strokeWidth={4 * S} strokeLinecap="round" fill="none" />
        <Ellipse cx={cx} cy={GROUND_Y + 5} rx={bodyR * 0.8} ry={4 * S} fill="#101010" opacity={0.2} />

        <G
          transform={
            `translate(${cx} ${cy + bob}) rotate(${pose.bodyRot}) ` +
            `scale(${pose.bodyScaleX * facing} ${pose.bodyScaleY}) translate(${-cx} ${-cy})`
          }
        >
          {/* Cola: abanico de plumas, más abierto con tailWag */}
          <G transform={`rotate(${-8 * facing} ${cx} ${cy})`}>
            {[-1, -0.5, 0, 0.5, 1].map((f, i) => {
              const spread = 0.18 + Math.min(1, pose.tailWag) * 0.22;
              const len = (16 + 10 * b.tailLength) * S;
              const ang = f * spread;
              const tx = cx - Math.cos(ang) * len * facing;
              const ty = cy + bodyR * 0.35 - Math.sin(ang) * len;
              return (
                <Path
                  key={i}
                  d={`M${cx - bodyR * 0.55 * facing} ${cy + bodyR * 0.3} Q${(cx + tx) / 2} ${(cy + ty) / 2 - 4 * S}, ${tx} ${ty}`}
                  stroke={b.accent}
                  strokeWidth={4.4 * S}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.92}
                />
              );
            })}
          </G>

          {/* Ala lejana */}
          <Path
            d={`M${cx - bodyR * 0.1 * facing} ${cy - bodyR * 0.1} Q${cx - bodyR * 0.6 * facing} ${cy + bodyR * 0.1 - wing * S}, ${cx - bodyR * 0.5 * facing} ${cy + bodyR * 0.7}`}
            stroke={dark}
            strokeWidth={bodyR * 0.4}
            strokeLinecap="round"
            fill="none"
            opacity={0.55}
          />

          {/* Patitas finas */}
          <Path d={`M${cx - bodyR * 0.25 * facing} ${cy + bodyR * 0.75} L${cx - bodyR * 0.25 * facing} ${GROUND_Y - 1}`} stroke="#D98B3A" strokeWidth={2.2 * S} strokeLinecap="round" />
          <Path
            d={`M${cx + bodyR * 0.22 * facing} ${cy + bodyR * 0.75 - pose.pawLift * 10 * S} L${cx + bodyR * 0.22 * facing} ${GROUND_Y - 1 - pose.pawLift * 14 * S}`}
            stroke="#D98B3A"
            strokeWidth={2.2 * S}
            strokeLinecap="round"
          />

          {/* Cuerpo */}
          <Ellipse cx={cx} cy={cy} rx={bodyR} ry={bodyR * (0.98 - agachado * 0.22)} fill={`url(#aveCuerpo_${uid})`} stroke={contorno} strokeWidth={1.2 * S} strokeOpacity={0.4} />
          <Ellipse cx={cx - bodyR * 0.08 * facing} cy={cy + bodyR * 0.3} rx={bodyR * 0.66} ry={bodyR * 0.5} fill={b.belly} opacity={0.85} />

          {/* Ala cercana */}
          <Path
            d={`M${cx - bodyR * 0.05 * facing} ${cy - bodyR * 0.15} Q${cx - bodyR * 0.7 * facing} ${cy + bodyR * 0.05 - wing * S}, ${cx - bodyR * 0.55 * facing} ${cy + bodyR * 0.75}`}
            stroke={b.base}
            strokeWidth={bodyR * 0.44}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={`M${cx - bodyR * 0.05 * facing} ${cy - bodyR * 0.15} Q${cx - bodyR * 0.7 * facing} ${cy + bodyR * 0.05 - wing * S}, ${cx - bodyR * 0.55 * facing} ${cy + bodyR * 0.75}`}
            stroke={b.accent}
            strokeWidth={2 * S}
            strokeLinecap="round"
            fill="none"
            opacity={0.6}
          />

          {/* Cabeza + copete */}
          <G transform={`rotate(${lookX * 6}) `}>
            <Ellipse cx={headCx} cy={headCy} rx={headR} ry={headR * 0.94} fill={b.base} stroke={contorno} strokeWidth={1.2 * S} strokeOpacity={0.4} />
            {b.fluff > 0.15 ? (
              <Path
                d={`M${headCx - headR * 0.1 * facing} ${headCy - headR * 0.95} Q${headCx} ${headCy - headR * 1.5}, ${headCx + headR * 0.15 * facing} ${headCy - headR * 0.9}`}
                stroke={b.accent}
                strokeWidth={2.6 * S}
                strokeLinecap="round"
                fill="none"
              />
            ) : null}

            {/* Pico */}
            <Path
              d={`M${headCx + headR * 0.75 * facing} ${headCy - headR * 0.08} L${headCx + (headR * 0.75 + beakLen) * facing} ${headCy + headR * 0.02 - abierta * headR * 0.22} L${headCx + headR * 0.72 * facing} ${headCy + headR * 0.32} Z`}
              fill={b.nose}
            />
            {abierta > 0.1 ? (
              <Path
                d={`M${headCx + headR * 0.75 * facing} ${headCy + headR * 0.06} L${headCx + (headR * 0.7 + beakLen) * facing} ${headCy + headR * 0.08 + abierta * headR * 0.2} L${headCx + headR * 0.72 * facing} ${headCy + headR * 0.32} Z`}
                fill={shade(b.nose, -40)}
              />
            ) : null}

            {/* Ojo */}
            {eyeOpen > 0.15 ? (
              <G>
                <Circle cx={headCx + headR * 0.28 * facing + lookX * 2} cy={headCy - headR * 0.08 + lookY * 2} r={headR * 0.24} fill="#FFFFFF" />
                <Circle cx={headCx + headR * 0.32 * facing + lookX * 2.6} cy={headCy - headR * 0.08 + lookY * 2.6} r={headR * 0.15} fill={b.eye} />
                <Circle cx={headCx + headR * 0.26 * facing} cy={headCy - headR * 0.16} r={headR * 0.06} fill="#FFFFFF" opacity={0.9} />
              </G>
            ) : (
              <Path d={`M${headCx + headR * 0.08 * facing} ${headCy - headR * 0.08} Q${headCx + headR * 0.28 * facing} ${headCy + headR * 0.04}, ${headCx + headR * 0.48 * facing} ${headCy - headR * 0.08}`} stroke="#241F1E" strokeWidth={headR * 0.08} fill="none" strokeLinecap="round" />
            )}

            {/* Mejilla */}
            <Ellipse cx={headCx - headR * 0.1 * facing} cy={headCy + headR * 0.35} rx={headR * 0.32} ry={headR * 0.26} fill={b.belly} opacity={0.6} />
          </G>
        </G>
      </G>
    </Svg>
  );
}

/**
 * Pez redondito nadando (o flotando quieto, dormido). `bodyY`/`bodyRot`
 * de la pose ya leen como ondulación al nadar; `tailWag` mueve la aleta
 * caudal, `mouthOpen` hace burbujas al "hablar"/comer.
 */
function Pez({
  size, breed, pose, uid, facing, lookX, lookY, clock,
}: { size: number; breed: ResolvedBreed; pose: Pose; uid: string; facing: 1 | -1; lookX: number; lookY: number; clock: number }) {
  const b = breed;
  const S = b.scale;
  const dark = shade(b.base, -30);
  const light = shade(b.base, 26);
  const contorno = shade(b.base, -55);
  const swim = Math.sin(clock * 2.1) * 3 * S;
  const cx = 100 + pose.bodyX * facing + swim;
  const cy = 96 + pose.bodyY + Math.sin(clock * 2.1 + 1) * 2 * S;
  const bodyRx = 34 * b.bodyLength * S;
  const bodyRy = 22 * b.bodyHeight * S;
  const eyeOpen = 1 - pose.eyeClose;
  const abierta = pose.mouthOpen;
  const tailSwish = Math.sin(clock * 5 * Math.max(0.3, pose.tailWag)) * (10 + 10 * Math.min(2, pose.tailWag));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`pezCuerpo_${uid}`} cx="40%" cy="30%" r="80%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="55%" stopColor={b.base} />
          <Stop offset="100%" stopColor={dark} />
        </RadialGradient>
      </Defs>
      {/* El pez no toca piso — nada en el agua, así que acá el margen se
          escala desde el centro, no desde GROUND_Y como en los demás. */}
      <G transform={`translate(100 100) scale(${PET_FIT}) translate(-100 -100)`}>
        <Ellipse cx={cx} cy={cy + bodyRy + 20} rx={bodyRx * 0.9} ry={6 * S} fill="#101010" opacity={0.12} />

        <G transform={`translate(${cx} ${cy}) rotate(${pose.bodyRot + Math.sin(clock * 2.1) * 4}) scale(${pose.bodyScaleX * facing} ${pose.bodyScaleY}) translate(${-cx} ${-cy})`}>
          {/* Aleta caudal */}
          <Path
            d={`M${cx - bodyRx * 0.85 * facing} ${cy} Q${cx - bodyRx * 1.25 * facing} ${cy - bodyRy * 0.9 + tailSwish}, ${cx - bodyRx * 1.55 * facing} ${cy - bodyRy * 1.5 + tailSwish}
               L${cx - bodyRx * 0.95 * facing} ${cy}
               L${cx - bodyRx * 1.55 * facing} ${cy + bodyRy * 1.5 + tailSwish}
               Q${cx - bodyRx * 1.25 * facing} ${cy + bodyRy * 0.9 + tailSwish}, ${cx - bodyRx * 0.85 * facing} ${cy}
               Z`}
            fill={b.accent}
            opacity={0.9}
          />
          {/* Aleta dorsal */}
          <Path d={`M${cx - bodyRx * 0.1 * facing} ${cy - bodyRy * 0.85} Q${cx} ${cy - bodyRy * 1.55}, ${cx + bodyRx * 0.35 * facing} ${cy - bodyRy * 0.8} Z`} fill={b.accent} opacity={0.85} />
          {/* Aleta pectoral (usa pawLift como aleteo) */}
          <Ellipse
            cx={cx + bodyRx * 0.1 * facing}
            cy={cy + bodyRy * 0.5 - pose.pawLift * 6 * S}
            rx={bodyRx * 0.22}
            ry={bodyRy * 0.34}
            fill={b.accent}
            opacity={0.8}
            transform={`rotate(${-20 * facing - pose.pawLift * 20 * facing} ${cx + bodyRx * 0.1 * facing} ${cy + bodyRy * 0.5})`}
          />

          {/* Cuerpo */}
          <Ellipse cx={cx} cy={cy} rx={bodyRx} ry={bodyRy} fill={`url(#pezCuerpo_${uid})`} stroke={contorno} strokeWidth={1.2 * S} strokeOpacity={0.4} />
          <Ellipse cx={cx + bodyRx * 0.05 * facing} cy={cy + bodyRy * 0.35} rx={bodyRx * 0.6} ry={bodyRy * 0.42} fill={b.belly} opacity={0.75} />
          {b.pattern === 'rayado'
            ? [0.25, 0.5, 0.75].map((f, i) => (
                <Path
                  key={i}
                  d={`M${cx - bodyRx * 0.5 + bodyRx * f} ${cy - bodyRy} Q${cx - bodyRx * 0.5 + bodyRx * f + 4 * S} ${cy}, ${cx - bodyRx * 0.5 + bodyRx * f} ${cy + bodyRy}`}
                  stroke={b.accent}
                  strokeWidth={4 * S}
                  opacity={0.4}
                  fill="none"
                />
              ))
            : null}

          {/* Boca */}
          <Ellipse
            cx={cx + bodyRx * 0.82 * facing}
            cy={cy + bodyRy * 0.1}
            rx={2.4 * S + abierta * 2.4 * S}
            ry={1.6 * S + abierta * 3.4 * S}
            fill="#5A2028"
          />

          {/* Ojo */}
          <Circle cx={cx + bodyRx * 0.55 * facing} cy={cy - bodyRy * 0.18} r={bodyRy * 0.32} fill="#FFFFFF" opacity={eyeOpen} />
          <Circle cx={cx + bodyRx * 0.58 * facing + lookX * 2} cy={cy - bodyRy * 0.18 + lookY * 2} r={bodyRy * 0.18} fill={b.eye} opacity={eyeOpen} />
          {eyeOpen < 0.2 ? (
            <Path d={`M${cx + bodyRx * 0.4 * facing} ${cy - bodyRy * 0.18} Q${cx + bodyRx * 0.55 * facing} ${cy - bodyRy * 0.04}, ${cx + bodyRx * 0.7 * facing} ${cy - bodyRy * 0.18}`} stroke="#241F1E" strokeWidth={1.4 * S} fill="none" strokeLinecap="round" />
          ) : null}
        </G>

        {pose.prop === 'zzz' || (pose.lie > 0.5 && eyeOpen < 0.3) ? (
          <G>
            {[0, 1, 2].map((i) => {
              const f = (clock * 0.35 + i * 0.33) % 1;
              return (
                <Circle
                  key={i}
                  cx={cx + bodyRx * 0.6 * facing + f * 10 * S}
                  cy={cy - bodyRy - f * 26 * S}
                  r={(3 + i) * S * (1 - f * 0.4)}
                  fill="#BEE6F5"
                  opacity={(1 - f) * 0.85}
                  stroke="#FFFFFF"
                  strokeWidth={0.6}
                />
              );
            })}
          </G>
        ) : null}
      </G>
    </Svg>
  );
}

/**
 * Vista frontal / espalda: silueta ortogonal simple para poder "girar" al animal.
 * No es un modelo 3D — alcanza para leer perfil · frente · espalda en el juego.
 */
function VistaOrtogonal({
  breed: b,
  pose,
  mode,
  lookX,
  lookY,
  squash,
  stretch,
  uid,
  clock,
}: {
  breed: ResolvedBreed;
  pose: Pose;
  mode: 'frente' | 'espalda';
  lookX: number;
  lookY: number;
  squash: number;
  stretch: number;
  uid: string;
  clock: number;
}) {
  const S = b.scale;
  const sit = pose.sit;
  const lie = pose.lie ?? 0;
  const bodyW = 34 * b.bodyWidth * S;
  const bodyH = (42 * b.bodyHeight * S) * (1 - sit * 0.28 - lie * 0.4);
  const headR = 16 * b.headSize * S;
  const legH = (18 + 20 * b.legLength) * S * (1 - sit * 0.55 - lie * 0.7);
  const cy = GROUND_Y - legH - bodyH * 0.45 + pose.bodyY;
  const cx = 100 + pose.bodyX;
  const dark = shade(b.base, -34);
  const light = shade(b.base, 28);
  const contorno = shade(b.base, -72);
  const sx = pose.bodyScaleX * (1 + squash * 0.08 - stretch * 0.05);
  const sy = pose.bodyScaleY * (1 - squash * 0.1 + stretch * 0.07);
  const wag = Math.sin(clock * 5 * Math.max(0.2, pose.tailWag)) * (8 + 10 * Math.min(2, pose.tailWag));
  const eyeOpen = 1 - pose.eyeClose;
  const mouth = pose.mouthOpen;

  return (
    <G transform={`translate(${cx} ${cy}) rotate(${pose.bodyRot * (mode === 'espalda' ? -1 : 1) * 0.15}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`}>
      {/* Sombra */}
      <Ellipse cx={100} cy={GROUND_Y + 2} rx={bodyW * 0.9} ry={5 * S} fill="#101010" opacity={0.22} />

      {mode === 'espalda' ? (
        <>
          {/* Cola centrada, visible */}
          <Path
            d={`M100 ${cy + bodyH * 0.1} Q${100 + wag * 0.4} ${cy - bodyH * 0.55}, ${100 + wag * 0.15} ${cy - bodyH * 0.95 - 18 * b.tailLength * S}`}
            stroke={b.pattern === 'colorpoint' ? b.accent : b.base}
            strokeWidth={(6 + 8 * b.tailFluff) * S}
            strokeLinecap="round"
            fill="none"
          />
          {/* Patas traseras */}
          <Ellipse cx={100 - bodyW * 0.38} cy={GROUND_Y - 3} rx={6 * S} ry={4.5 * S} fill={dark} />
          <Ellipse cx={100 + bodyW * 0.38} cy={GROUND_Y - 3} rx={6 * S} ry={4.5 * S} fill={dark} />
          {/* Cuerpo */}
          <Ellipse cx={100} cy={cy} rx={bodyW * 0.72} ry={bodyH * 0.55} fill={b.base} stroke={contorno} strokeWidth={1.2 * S} strokeOpacity={0.45} />
          {/* Cabeza de espalda */}
          <Circle cx={100} cy={cy - bodyH * 0.55 - headR * 0.35} r={headR * 0.92} fill={shade(b.base, -8)} />
          {/* Orejas */}
          <Path d={`M${100 - headR * 0.55} ${cy - bodyH * 0.55 - headR * 0.7} L${100 - headR * 0.85} ${cy - bodyH * 0.55 - headR * 1.35} L${100 - headR * 0.15} ${cy - bodyH * 0.55 - headR * 0.85} Z`} fill={dark} />
          <Path d={`M${100 + headR * 0.55} ${cy - bodyH * 0.55 - headR * 0.7} L${100 + headR * 0.85} ${cy - bodyH * 0.55 - headR * 1.35} L${100 + headR * 0.15} ${cy - bodyH * 0.55 - headR * 0.85} Z`} fill={dark} />
        </>
      ) : (
        <>
          {/* Patas traseras (detrás) */}
          <G opacity={0.65}>
            <Ellipse cx={100 - bodyW * 0.42} cy={GROUND_Y - 2} rx={5.5 * S} ry={4 * S} fill={dark} />
            <Ellipse cx={100 + bodyW * 0.42} cy={GROUND_Y - 2} rx={5.5 * S} ry={4 * S} fill={dark} />
          </G>
          {/* Cuerpo */}
          <Ellipse cx={100} cy={cy} rx={bodyW * 0.7} ry={bodyH * 0.55} fill={light} stroke={contorno} strokeWidth={1.2 * S} strokeOpacity={0.45} />
          <Ellipse cx={100} cy={cy + bodyH * 0.12} rx={bodyW * 0.42} ry={bodyH * 0.28} fill={b.belly} opacity={0.85} />
          {/* Patas delanteras */}
          <Ellipse cx={100 - bodyW * 0.28} cy={GROUND_Y - 2} rx={6 * S} ry={4.2 * S} fill={b.base} />
          <Ellipse cx={100 + bodyW * 0.28 + pose.pawLift * 8} cy={GROUND_Y - 2 - pose.pawLift * 14} rx={6 * S} ry={4.2 * S} fill={b.base} />
          {/* Cabeza */}
          <Circle
            cx={100 + pose.headX}
            cy={cy - bodyH * 0.55 - headR * 0.4 + pose.headY}
            r={headR}
            fill={b.base}
            stroke={contorno}
            strokeWidth={1.2 * S}
            strokeOpacity={0.45}
          />
          {/* Orejas */}
          <Path
            d={`M${100 - headR * 0.55 + pose.headX} ${cy - bodyH * 0.55 - headR * 0.85 + pose.headY} L${100 - headR * 0.9} ${cy - bodyH * 0.55 - headR * 1.45 + pose.earFlap * 0.05} L${100 - headR * 0.2} ${cy - bodyH * 0.55 - headR * 1.0} Z`}
            fill={b.base}
          />
          <Path
            d={`M${100 + headR * 0.55 + pose.headX} ${cy - bodyH * 0.55 - headR * 0.85 + pose.headY} L${100 + headR * 0.9} ${cy - bodyH * 0.55 - headR * 1.45 - pose.earFlap * 0.05} L${100 + headR * 0.2} ${cy - bodyH * 0.55 - headR * 1.0} Z`}
            fill={b.base}
          />
          {/* Ojos */}
          {eyeOpen > 0.15 ? (
            <>
              <Ellipse cx={100 - headR * 0.32 + lookX * 2 + pose.headX} cy={cy - bodyH * 0.55 - headR * 0.45 + lookY * 2 + pose.headY} rx={3.2 * S * eyeOpen} ry={3.6 * S * eyeOpen} fill="#1C1A19" />
              <Ellipse cx={100 + headR * 0.32 + lookX * 2 + pose.headX} cy={cy - bodyH * 0.55 - headR * 0.45 + lookY * 2 + pose.headY} rx={3.2 * S * eyeOpen} ry={3.6 * S * eyeOpen} fill="#1C1A19" />
            </>
          ) : (
            <>
              <Path d={`M${100 - headR * 0.48} ${cy - bodyH * 0.55 - headR * 0.45} Q${100 - headR * 0.32} ${cy - bodyH * 0.55 - headR * 0.35}, ${100 - headR * 0.16} ${cy - bodyH * 0.55 - headR * 0.45}`} stroke="#1C1A19" strokeWidth={1.4 * S} fill="none" />
              <Path d={`M${100 + headR * 0.16} ${cy - bodyH * 0.55 - headR * 0.45} Q${100 + headR * 0.32} ${cy - bodyH * 0.55 - headR * 0.35}, ${100 + headR * 0.48} ${cy - bodyH * 0.55 - headR * 0.45}`} stroke="#1C1A19" strokeWidth={1.4 * S} fill="none" />
            </>
          )}
          {/* Nariz + boca */}
          <Ellipse cx={100 + pose.headX} cy={cy - bodyH * 0.55 - headR * 0.12 + pose.headY} rx={2.4 * S} ry={1.8 * S} fill="#E8A0B0" />
          <Path
            d={`M${100 - 4 * S - mouth * 2} ${cy - bodyH * 0.55 + headR * 0.05 + pose.headY} Q${100} ${cy - bodyH * 0.55 + headR * (0.12 + mouth * 0.35) + pose.headY}, ${100 + 4 * S + mouth * 2} ${cy - bodyH * 0.55 + headR * 0.05 + pose.headY}`}
            stroke="#1C1A19"
            strokeWidth={1.3 * S}
            fill={mouth > 0.25 ? '#3A2228' : 'none'}
          />
        </>
      )}

      {pose.prop === 'zzz' ? (
        <G>
          {[0, 1, 2].map((i) => {
            const f = (pose.propT * 1.2 + i * 0.33) % 1;
            const x = 100 + f * 12 * S;
            const y = cy - bodyH - headR - f * 28 * S;
            const s = (5 + i) * S;
            return (
              <Path key={`${uid}z${i}`} d={`M${x} ${y} L${x + s} ${y} L${x} ${y + s} L${x + s} ${y + s}`} stroke="#FFFFFF" strokeWidth={2 * S} fill="none" opacity={(1 - f) * 0.9} />
            );
          })}
        </G>
      ) : null}
    </G>
  );
}


/* --------------------------------------------------------------- utilería */
function Utileria({
  prop, t, nx, ny, headR, S, clock,
}: { prop: string; t: number; nx: number; ny: number; headR: number; S: number; clock: number }) {
  switch (prop) {
    case 'plato':
      return (
        <G>
          <Ellipse cx={nx} cy={GROUND_Y - 3} rx={17 * S} ry={5 * S} fill="#4E6E96" />
          <Ellipse cx={nx} cy={GROUND_Y - 5.5} rx={14 * S} ry={4 * S} fill="#8FB0D6" />
          <Ellipse cx={nx} cy={GROUND_Y - 6.5} rx={10.5 * S * Math.max(0, 1 - t)} ry={2.7 * S * Math.max(0, 1 - t)} fill="#C98B3C" />
        </G>
      );
    case 'pelota': {
      const bounce = Math.abs(Math.sin(t * Math.PI * 3));
      const bx = nx + 30 * S;
      const by = GROUND_Y - 8 - bounce * 44;
      return (
        <G>
          <Circle cx={bx} cy={by} r={7.5 * S} fill="#E8574C" />
          <Path d={`M${bx - 7.5 * S} ${by} q${7.5 * S} ${-5 * S}, ${15 * S} 0`} stroke="#FFF" strokeWidth={1.6 * S} fill="none" opacity={0.85} />
        </G>
      );
    }
    case 'agua':
      return (
        <G opacity={t < 0.9 ? 1 : (1 - t) * 10}>
          {Array.from({ length: 10 }, (_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            const d = 32 + Math.sin(clock * 8 + i) * 12;
            return <Ellipse key={i} cx={100 + Math.cos(ang) * d * S} cy={GROUND_Y - 34 + Math.sin(ang) * d * 0.62 * S} rx={2.4 * S} ry={3.4 * S} fill="#9FD3EA" opacity={0.85} />;
          })}
        </G>
      );
    case 'zzz':
      return (
        <G>
          {[0, 1, 2].map((i) => {
            const f = (t * 1.2 + i * 0.33) % 1;
            const x = nx + f * 14 * S;
            const y = ny - headR * 1.6 - f * 34 * S;
            const s = (5 + i) * S;
            return (
              <Path key={i} d={`M${x} ${y} L${x + s} ${y} L${x} ${y + s} L${x + s} ${y + s}`} stroke="#FFFFFF" strokeWidth={2 * S} fill="none" opacity={(1 - f) * 0.9} />
            );
          })}
        </G>
      );
    case 'estrellas':
      return (
        <G>
          {Array.from({ length: 6 }, (_, i) => {
            const ang = (i / 6) * Math.PI * 2 + t * 3;
            const d = 24 + t * 22;
            return <Circle key={i} cx={nx - headR + Math.cos(ang) * d * S} cy={ny - headR * 1.4 + Math.sin(ang) * d * 0.6 * S} r={(3.2 - t * 1.6) * S} fill="#FFD65A" opacity={1 - t} />;
          })}
        </G>
      );
    case 'corazon':
      return (
        <G>
          {[0, 1, 2].map((i) => {
            const f = (t * 1.1 + i * 0.3) % 1;
            const y = ny - headR * 1.8 - f * 38 * S;
            const x = nx - headR * 0.6 + Math.sin(f * 6 + i) * 6 * S;
            const s = 4.6 * S * (1 - f * 0.3);
            return (
              <Path key={i} d={`M${x} ${y + s} C${x - s * 1.4} ${y - s * 0.4}, ${x - s * 0.3} ${y - s * 1.3}, ${x} ${y - s * 0.35} C${x + s * 0.3} ${y - s * 1.3}, ${x + s * 1.4} ${y - s * 0.4}, ${x} ${y + s} Z`} fill="#E8577E" opacity={(1 - f) * 0.95} />
            );
          })}
        </G>
      );
    case 'nube':
      return (
        <G opacity={1 - t * 0.7}>
          <Ellipse cx={nx - headR * 0.3} cy={ny - headR * 2.1} rx={11 * S} ry={7 * S} fill="#9AA3AD" opacity={0.7} />
          <Ellipse cx={nx + headR * 0.2} cy={ny - headR * 1.8} rx={8 * S} ry={5.5 * S} fill="#9AA3AD" opacity={0.6} />
        </G>
      );
    case 'hueso': {
      if (t > 0.6) return null;
      const y = ny - 66 * S + t * 60 * S;
      const x = nx + 3 * S;
      const s = 6 * S;
      return (
        <G transform={`rotate(${t * 220} ${x} ${y})`}>
          <Rect x={x - s} y={y - s * 0.3} width={s * 2} height={s * 0.6} rx={s * 0.3} fill="#F2E8D5" />
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy], i) => (
            <Circle key={i} cx={x + s * (sx as number)} cy={y + s * 0.35 * (sy as number)} r={s * 0.4} fill="#F2E8D5" />
          ))}
        </G>
      );
    }
    default:
      return null;
  }
}

function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
