/**
 * Motor de física de HueSoccer. Lógica pura, sin React ni dibujo.
 *
 * No hay ninguna librería de física en el proyecto (confirmado: no hay
 * matter-js, box2d, react-native-game-engine ni nada parecido en
 * package.json), así que esto es un loop de física a mano: fricción
 * multiplicativa, rebote elástico en las paredes, colisión elástica entre
 * círculos de masa igual. No pretende ser exacto — pretende ser lo bastante
 * creíble para un juego casual, con un resultado 100% determinístico dado un
 * estado inicial y un impulso (mismo tiro, mismo resultado, siempre).
 */

export type Vector = { x: number; y: number };
export type Cancha = { ancho: number; alto: number; radioFicha: number; radioPelota: number };
export type FichaSoccer = { j: 1 | 2; n: number; x: number; y: number };
export type TableroSoccer = {
  fichas: FichaSoccer[];
  pelota: Vector;
  golesJ1: number;
  golesJ2: number;
  cancha: Cancha;
};

export const CANCHA: Cancha = { ancho: 300, alto: 500, radioFicha: 18, radioPelota: 10 };
export const GOLES_PARA_GANAR = 3;
/** Ancho del arco, centrado en cada borde angosto de la cancha. */
export const ANCHO_ARCO = CANCHA.ancho * 0.4;

const FRICCION = 0.96;
const VEL_MINIMA = 0.05;
/** Guard anti-loop-infinito: cota de pasos, no de tiempo real (determinístico). */
const MAX_FRAMES = 600;

type Cuerpo = { id: string; pos: Vector; vel: Vector; radio: number };

function magnitud(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Tablero inicial: 3 fichas por jugador en formación fija, pelota al centro. */
export function tableroInicial(): TableroSoccer {
  const { ancho, alto } = CANCHA;
  const fichas: FichaSoccer[] = [
    { j: 1, n: 0, x: ancho * 0.3, y: alto * 0.22 },
    { j: 1, n: 1, x: ancho * 0.5, y: alto * 0.14 },
    { j: 1, n: 2, x: ancho * 0.7, y: alto * 0.22 },
    { j: 2, n: 0, x: ancho * 0.3, y: alto * 0.78 },
    { j: 2, n: 1, x: ancho * 0.5, y: alto * 0.86 },
    { j: 2, n: 2, x: ancho * 0.7, y: alto * 0.78 },
  ];
  return { fichas, pelota: { x: ancho / 2, y: alto / 2 }, golesJ1: 0, golesJ2: 0, cancha: CANCHA };
}

function idFicha(f: FichaSoccer): string {
  return `f${f.j}_${f.n}`;
}

function aCuerpos(t: TableroSoccer): Cuerpo[] {
  const cuerpos: Cuerpo[] = t.fichas.map((f) => ({
    id: idFicha(f),
    pos: { x: f.x, y: f.y },
    vel: { x: 0, y: 0 },
    radio: t.cancha.radioFicha,
  }));
  cuerpos.push({ id: 'pelota', pos: { ...t.pelota }, vel: { x: 0, y: 0 }, radio: t.cancha.radioPelota });
  return cuerpos;
}

/** ¿Ese x cae dentro de la franja del arco (centrado en el medio de la cancha)? */
function dentroDeLaFranjaDelArco(x: number, cancha: Cancha): boolean {
  return Math.abs(x - cancha.ancho / 2) <= ANCHO_ARCO / 2;
}

/**
 * Rebote elástico contra las 4 paredes, salvo que sea la pelota cruzando la
 * franja del arco por un borde angosto — ahí es gol, no rebote.
 *
 * El chequeo de gol usa EXACTAMENTE la misma condición de borde que el
 * rebote (`pos ± radio` cruzando el límite de la cancha), no un umbral
 * aparte: si se usaran dos umbrales distintos, el que se cruza primero
 * "gana" sin que tenga que ver con si la pelota entró o no — el rebote
 * podía terminar interceptando la pelota antes de que llegara a contarse
 * como gol.
 */
function rebotePared(c: Cuerpo, cancha: Cancha, esPelota: boolean): 1 | 2 | null {
  if (c.pos.x - c.radio < 0) {
    c.pos.x = c.radio;
    c.vel.x = Math.abs(c.vel.x);
  } else if (c.pos.x + c.radio > cancha.ancho) {
    c.pos.x = cancha.ancho - c.radio;
    c.vel.x = -Math.abs(c.vel.x);
  }

  if (c.pos.y - c.radio < 0) {
    if (esPelota && dentroDeLaFranjaDelArco(c.pos.x, cancha)) return 2; // cruzó el arco de arriba (de j:1) -> gol para j:2
    c.pos.y = c.radio;
    c.vel.y = Math.abs(c.vel.y);
  } else if (c.pos.y + c.radio > cancha.alto) {
    if (esPelota && dentroDeLaFranjaDelArco(c.pos.x, cancha)) return 1; // cruzó el arco de abajo (de j:2) -> gol para j:1
    c.pos.y = cancha.alto - c.radio;
    c.vel.y = -Math.abs(c.vel.y);
  }
  return null;
}

/**
 * Colisión elástica entre dos círculos de masa igual: se separan por la
 * penetración y se intercambian las componentes de velocidad a lo largo de
 * la normal de colisión (masas iguales → simplemente se cambian esas
 * componentes, la tangencial no se toca).
 */
function resolverColision(a: Cuerpo, b: Cuerpo): void {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radio + b.radio;
  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // Separar por la penetración, mitad y mitad.
  const solape = minDist - dist;
  a.pos.x -= (nx * solape) / 2;
  a.pos.y -= (ny * solape) / 2;
  b.pos.x += (nx * solape) / 2;
  b.pos.y += (ny * solape) / 2;

  // Componente de cada velocidad a lo largo de la normal.
  const velA = a.vel.x * nx + a.vel.y * ny;
  const velB = b.vel.x * nx + b.vel.y * ny;
  // Ya se están separando, no hace falta intercambiar nada.
  if (velB - velA > 0) return;

  a.vel.x += (velB - velA) * nx;
  a.vel.y += (velB - velA) * ny;
  b.vel.x += (velA - velB) * nx;
  b.vel.y += (velA - velB) * ny;
}

export type ResultadoTiro = {
  estadoFinal: TableroSoccer;
  trayectorias: Record<string, Vector[]>;
  gol: 1 | 2 | null;
};

/**
 * Simula un tiro completo: aplica el impulso a la ficha `fichaId` y corre el
 * loop de física hasta que todo llega a reposo, hay gol, o se alcanza
 * `MAX_FRAMES` (guard anti-cuelgue). Determinístico: mismo estado + mismo
 * impulso = mismo resultado, siempre.
 */
export function simularTiro(estadoInicial: TableroSoccer, fichaId: string, impulso: Vector): ResultadoTiro {
  const cancha = estadoInicial.cancha;
  const cuerpos = aCuerpos(estadoInicial);
  const golpeada = cuerpos.find((c) => c.id === fichaId);
  if (golpeada) {
    golpeada.vel.x = impulso.x;
    golpeada.vel.y = impulso.y;
  }

  const trayectorias: Record<string, Vector[]> = {};
  for (const c of cuerpos) trayectorias[c.id] = [{ ...c.pos }];

  let gol: 1 | 2 | null = null;

  for (let frame = 0; frame < MAX_FRAMES && !gol; frame++) {
    let algoEnMovimiento = false;

    for (const c of cuerpos) {
      if (magnitud(c.vel) <= VEL_MINIMA) {
        c.vel = { x: 0, y: 0 };
        continue;
      }
      algoEnMovimiento = true;
      c.pos.x += c.vel.x;
      c.pos.y += c.vel.y;
      c.vel.x *= FRICCION;
      c.vel.y *= FRICCION;

      const resultadoPared = rebotePared(c, cancha, c.id === 'pelota');
      if (resultadoPared) gol = resultadoPared;
    }

    for (let i = 0; i < cuerpos.length && !gol; i++) {
      for (let j = i + 1; j < cuerpos.length; j++) {
        resolverColision(cuerpos[i]!, cuerpos[j]!);
      }
    }

    for (const c of cuerpos) trayectorias[c.id]!.push({ ...c.pos });
    if (!algoEnMovimiento) break;
  }

  const fichas: FichaSoccer[] = estadoInicial.fichas.map((f) => {
    const c = cuerpos.find((cu) => cu.id === idFicha(f))!;
    return { ...f, x: c.pos.x, y: c.pos.y };
  });
  const pelotaCuerpo = cuerpos.find((c) => c.id === 'pelota')!;

  // OJO: acá NO se recentra la pelota ni se suma el gol al contador, aunque
  // `gol` haya dado 1 o 2. `estadoFinal.pelota` queda en la posición real
  // donde cruzó la línea — es lo que se manda al servidor, que es quien
  // decide el gol de verdad (mirando esa posición con la misma regla que
  // este motor) y recién ahí recentra la pelota y suma el contador antes de
  // guardar. Si el cliente recentrara acá, el servidor ya no tendría cómo
  // verificar nada: sólo vería una pelota prolijamente en el medio.
  return {
    estadoFinal: {
      fichas,
      pelota: { x: pelotaCuerpo.pos.x, y: pelotaCuerpo.pos.y },
      golesJ1: estadoInicial.golesJ1,
      golesJ2: estadoInicial.golesJ2,
      cancha,
    },
    trayectorias,
    gol,
  };
}
