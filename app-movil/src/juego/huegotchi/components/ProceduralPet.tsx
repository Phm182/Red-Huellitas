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
  uid?: string;
  clock: number;
};

const GROUND_Y = 150;

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
  uid = 'p',
  clock,
}: Props) {
  const b = breed;
  const S = b.scale;
  const id = (n: string) => `${n}_${uid}`;

  if (b.species === 'tortuga') {
    return <Tortuga size={size} breed={b} pose={pose} uid={uid} facing={facing} lookX={lookX} />;
  }

  const esGato = b.species === 'gato';
  const sit = pose.sit;

  // ------------------------------------------------------- esqueleto
  const legH = (11 + 27 * b.legLength) * S;
  const torsoH = 26 * b.bodyHeight * S;
  const torsoLen = 62 * b.bodyLength * S;
  // La silueta de la cabeza abarca ~2.5 radios (cráneo + morro). Con radio 18
  // quedaba más alta que el torso entero y el bicho parecía un cabezón; 12.5
  // deja la cabeza en ~45% del largo del lomo, que es proporción de dibujo
  // animado sin llegar a deformidad.
  const headR = 12.5 * b.headSize * S;
  const muzLen = headR * (0.22 + 1.0 * b.snoutLength);
  const muzDrop = headR * (0.24 + 0.1 * b.snoutLength);

  // Sentado: se hunde la cadera y las patas traseras se plieganatural.
  const sitDrop = sit * torsoH * 0.55;
  const legHTras = legH * (1 - sit * 0.72);

  const torsoBottom = GROUND_Y - legH;
  const torsoTop = torsoBottom - torsoH;
  const torsoBottomTras = GROUND_Y - legHTras;
  const torsoTopTras = torsoTop + sitDrop;

  const anchoTotal = torsoLen + headR * 1.5 + muzLen;
  const rumpX = 100 - anchoTotal / 2 + headR * 0.25;
  const chestX = rumpX + torsoLen;

  const headCx = chestX + headR * 0.16;
  const headCy = torsoTop - headR * 0.36;

  // Lomo: los gatos lo tienen arqueado, los perros más recto.
  const arco = esGato ? -torsoH * 0.1 : torsoH * 0.04;
  const panza = torsoH * (0.06 + (b.bodyWidth - 1) * 0.42);

  const dark = shade(b.base, -34);
  const darker = shade(b.base, -58);
  const light = shade(b.base, 30);
  const contorno = shade(b.base, -72);

  // ------------------------------------------------------- silueta del torso
  const torso: Pt[] = [
    // Cruz y hombro: sin este par el frente quedaba como una pared vertical.
    [chestX - torsoLen * 0.12, torsoTop - torsoH * 0.06],
    [chestX - torsoLen * 0.34, torsoTop + arco * 0.5],
    [chestX - torsoLen * 0.62, torsoTop + arco],
    [rumpX + torsoLen * 0.05, torsoTopTras + torsoH * 0.08],
    [rumpX - torsoH * 0.12, torsoTopTras + torsoH * 0.5],
    [rumpX + torsoH * 0.2, torsoBottomTras],
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
        <LinearGradient id={id('pelo')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="52%" stopColor={b.base} />
          <Stop offset="100%" stopColor={dark} />
        </LinearGradient>
        <RadialGradient id={id('craneo')} cx="38%" cy="26%" r="76%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="60%" stopColor={b.base} />
          <Stop offset="100%" stopColor={dark} />
        </RadialGradient>
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

      {/* Sombra en el piso: no acompaña el salto, se achica. */}
      <Sombra pose={pose} rumpX={rumpX} chestX={chestX} S={S} />

      <G
        transform={
          `translate(${100 + pose.bodyX * facing} ${torsoTop + pose.bodyY}) ` +
          `scale(${facing} 1) ` +
          `rotate(${pose.bodyRot}) ` +
          `scale(${pose.bodyScaleX * (1 + squash * 0.1 - stretch * 0.06)} ${
            pose.bodyScaleY * (1 - squash * 0.12 + stretch * 0.09)
          }) ` +
          `translate(${-100} ${-torsoTop})`
        }
      >
        {/* ---------- patas del lado lejano (más oscuras, detrás) ---------- */}
        <G opacity={0.72}>
          {pataTrasera(rumpX - 3 * S, torsoBottomTras, GROUND_Y, torsoH, legHTras, grosorPata, darker, 0)}
          {pataDelantera(chestX - torsoH * 0.34, torsoBottom, GROUND_Y, legH, grosorPata, darker, 0)}
        </G>

        {/* ---------- cola (detrás del cuerpo) ---------- */}
        <Cola b={b} rumpX={rumpX} y={torsoTopTras + torsoH * 0.18} S={S} pose={pose} clock={clock} />

        {/* ---------- cuello (debajo del torso y la cabeza) ---------- */}
        <Path d={curvaCerrada(cuello)} fill={b.pattern === 'colorpoint' ? shade(b.base, -8) : b.base} />

        {/* ---------- torso ---------- */}
        <Path d={curvaCerrada(torso)} fill={`url(#${id('pelo')})`} stroke={contorno} strokeWidth={1.4 * S} strokeOpacity={0.5} />
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
        {pataTrasera(rumpX + 3 * S, torsoBottomTras, GROUND_Y, torsoH, legHTras, grosorPata, colorPata(b, dark), sit)}
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

          <Path d={curvaCerrada(cabeza)} fill={`url(#${id('craneo')})`} stroke={contorno} strokeWidth={1.4 * S} strokeOpacity={0.5} />
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
  return (
    <G transform={`rotate(${rot} ${x} ${top})`}>
      <Path
        d={`M${x} ${top - grosor * 0.4} Q${codo[0]} ${codo[1]}, ${x + grosor * 0.05} ${pie - grosor * 0.35}`}
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap="round"
        fill="none"
      />
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
  return (
    <G>
      {/* Muslo: más ancho que la caña */}
      <Path
        d={`M${cadera[0]} ${cadera[1]} Q${rodilla[0] + grosor * 0.3} ${rodilla[1] - legH * 0.1}, ${rodilla[0]} ${rodilla[1]}`}
        stroke={color}
        strokeWidth={grosor * 1.55}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={`M${rodilla[0]} ${rodilla[1]} L${corvejon[0]} ${corvejon[1]} L${pie[0]} ${pie[1] - grosor * 0.35}`}
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
  const len = 30 * b.tailLength * S;
  const base = (5.5 + 7 * b.tailFluff) * S;
  const punta = (1.8 + 5.5 * b.tailFluff) * S;
  const wag = Math.sin(clock * 6 * Math.max(0.2, pose.tailWag)) * (7 + 16 * Math.min(2, pose.tailWag));
  // Los gatos la llevan alta y curva; los perros más tendida.
  const alta = b.species === 'gato';
  const x0 = rumpX + 2;
  const cx1 = rumpX - len * (alta ? 0.2 : 0.42);
  const cy1 = y - len * (alta ? 0.48 : 0.26);
  const tx = rumpX + len * (alta ? 0.04 : -0.72);
  const ty = y - len * (alta ? 0.82 : 0.42);

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
      <Ellipse cx={x0 + base * 0.2} cy={y} rx={base * 0.75} ry={base * 0.62} fill={color} />
      <Path d={d} fill={color} stroke={shade(color, -46)} strokeWidth={0.9} strokeOpacity={0.35} />
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
  const borde = shade(color, -50);
  let pts: Pt[];

  // Las orejas puntiagudas van como polígono, sin suavizar: al pasarlas por
  // `curvaCerrada` la punta se redondeaba y quedaban como globos en vez de
  // orejas de gato o de pastor.
  const triangulo = (alto: number, ancho: number, interior: boolean) => {
    const x0 = bx - headR * ancho * 0.42;
    const x1 = bx + headR * ancho * 0.58;
    const tip = bx + headR * ancho * 0.06;
    return (
      <G transform={`rotate(${rot} ${bx} ${by})`}>
        <Path
          d={`M${x0} ${by + headR * 0.26} L${tip} ${by - headR * alto} L${x1} ${by + headR * 0.18} Z`}
          fill={color}
          stroke={borde}
          strokeWidth={0.9}
          strokeOpacity={0.4}
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
    case 'erecta_redonda':
      return (
        <G transform={`rotate(${rot} ${bx} ${by})`}>
          <Ellipse
            cx={bx + headR * 0.06}
            cy={by - headR * 0.36 * e}
            rx={headR * 0.36 * e}
            ry={headR * 0.6 * e}
            fill={color}
            stroke={shade(color, -50)}
            strokeWidth={0.9}
            strokeOpacity={0.4}
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
      <Path d={curvaCerrada(pts)} fill={color} stroke={shade(color, -50)} strokeWidth={0.9} strokeOpacity={0.4} />
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
  const eR = headR * (b.snoutLength < 0.2 ? 0.23 : 0.2);
  const px = ex + lookX * eR * 0.42;
  const py = ey + lookY * eR * 0.34;

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
        stroke={contorno}
        strokeWidth={headR * 0.06}
        strokeOpacity={0.65}
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
      <Ellipse cx={nx - headR * 0.05} cy={ny - headR * 0.02} rx={headR * 0.17} ry={headR * 0.14} fill={b.nose} />
      <Ellipse cx={nx - headR * 0.09} cy={ny - headR * 0.06} rx={headR * 0.05} ry={headR * 0.035} fill="#FFFFFF" opacity={0.5} />

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
          <Ellipse cx={ex} cy={ey} rx={eR} ry={eR * abierto} fill="#FFFDF8" stroke={contorno} strokeWidth={0.7} strokeOpacity={0.45} />
          <Circle cx={px} cy={py} r={eR * 0.62 * abierto + eR * 0.1} fill={b.eye} />
          {/* Pupila: rendija vertical en gatos, redonda en perros */}
          {b.species === 'gato' ? (
            <Ellipse cx={px} cy={py} rx={eR * 0.16} ry={eR * 0.52 * abierto} fill="#141110" />
          ) : (
            <Circle cx={px} cy={py} r={eR * 0.34 * abierto + eR * 0.06} fill="#141110" />
          )}
          <Circle cx={px - eR * 0.26} cy={py - eR * 0.3} r={eR * 0.19} fill="#FFFFFF" opacity={0.95} />
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
          opacity={0.58}
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
      <Ellipse cx={cx} cy={GROUND_Y + 3} rx={rx * 1.05} ry={5 * S} fill="#101010" opacity={0.24} />
      <G transform={`translate(${100 + pose.bodyX * facing} ${pose.bodyY}) scale(${facing} 1) translate(${-100} 0)`}>
        {/* Patas */}
        {[-0.72, -0.3, 0.3, 0.72].map((f, i) => (
          <Ellipse key={i} cx={cx + rx * f} cy={GROUND_Y - 5 * S} rx={8 * S} ry={5.4 * S} fill={dark} />
        ))}
        {/* Cuello y cabeza */}
        <Path d={`M${cx + rx * 0.72} ${cy} Q${cx + rx * 1.05} ${cy - ry * 0.2}, ${cx + rx * 1.18} ${cy - ry * 0.55}`} stroke={shade(b.base, 12)} strokeWidth={13 * S} strokeLinecap="round" fill="none" />
        <Circle cx={cx + rx * 1.22} cy={cy - ry * 0.62} r={11 * S} fill={shade(b.base, 16)} />
        <Circle cx={cx + rx * 1.3} cy={cy - ry * 0.78} r={2.1 * S} fill="#1C1A19" />
        {/* Caparazón */}
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#caparazon_${uid})`} stroke={shade(b.base, -60)} strokeWidth={1.4 * S} strokeOpacity={0.5} />
        <Ellipse cx={cx} cy={cy + ry * 0.1} rx={rx * 0.66} ry={ry * 0.6} fill={dark} opacity={0.3} />
        {[[-0.4, -0.18], [0, -0.3], [0.4, -0.18], [-0.22, 0.22], [0.22, 0.22]].map(([fx, fy], i) => (
          <Ellipse key={i} cx={cx + rx * (fx as number)} cy={cy + ry * (fy as number)} rx={rx * 0.15} ry={ry * 0.19} fill={b.accent} opacity={0.5} />
        ))}
      </G>
    </Svg>
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
