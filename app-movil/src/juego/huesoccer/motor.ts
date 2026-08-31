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
export type Cancha = {
  ancho: number;
  alto: number;
  radioFicha: number;
  radioPelota: number;
  /** Cuánto se extiende el arco (y la red) por FUERA de la cancha de siempre. */
  profundidadArco: number;
};
export type FichaSoccer = { j: 1 | 2; n: number; x: number; y: number };
export type TableroSoccer = {
  fichas: FichaSoccer[];
  pelota: Vector;
  golesJ1: number;
  golesJ2: number;
  cancha: Cancha;
  /** Epoch segundos de cuándo arrancó el turno actual — lo pisa el servidor en cada avance. */
  turnoEmpezoEn: number;
  /** Acumulado compartido entre los dos jugadores, tope TOPE_SEGUNDOS_NETOS. */
  segundosNetosUsados: number;
  /**
   * A cuántos goles termina el partido, elegido al crear el duelo (ver
   * `retar.tsx`). Opcional en el tipo porque un desafío creado ANTES de que
   * esto existiera tiene su Tablero guardado sin esta clave — mismo criterio
   * de compatibilidad que ya usa el servidor
   * (`$anterior['metaGoles'] ?? RH_SOCCER_GOLES_PARA_GANAR_DEFAULT`).
   */
  metaGoles?: number;
};

export const CANCHA: Cancha = {
  ancho: 300,
  alto: 500,
  radioFicha: 18,
  radioPelota: 10,
  // Bien más grande que 2*radioPelota (lo que hace falta para cruzar
  // entera la línea y ya ser gol) a propósito: es un guard defensivo para
  // casos patológicos, nunca debería intervenir en una jugada real — ver
  // el comentario de rebotePared().
  profundidadArco: 60,
};
/**
 * Default de la meta de goles cuando no se eligió nada (o el duelo es viejo
 * y su Tablero no tiene `metaGoles` guardado) — el valor real por partido lo
 * elige quien reta, ver `retar.tsx` y `RH_SOCCER_GOLES_MIN/MAX` en el PHP.
 */
export const GOLES_PARA_GANAR_DEFAULT = 3;
export const GOLES_MIN = 1;
export const GOLES_MAX = 10;
/** Ancho del arco, centrado en cada borde angosto de la cancha. */
export const ANCHO_ARCO = CANCHA.ancho * 0.4;
/** Cuánto tiempo real tiene cada jugador para tirar una vez que le toca. */
export const SEGUNDOS_POR_TURNO = 20;
/** Tope de tiempo neto de juego del partido entero, sumado entre los dos. */
export const TOPE_SEGUNDOS_NETOS = 180;

const FRICCION = 0.96;
const VEL_MINIMA = 0.05;
/** Guard anti-loop-infinito: cota de pasos, no de tiempo real (determinístico). */
const MAX_FRAMES = 600;

type Cuerpo = { id: string; pos: Vector; vel: Vector; radio: number };

function magnitud(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Tablero inicial: 5 fichas por jugador (2 atrás + 3 adelante, formación
 * espejada), pelota al centro. `j:1` ataca hacia `y=alto`, `j:2` hacia `y=0`.
 */
export function tableroInicial(metaGoles: number = GOLES_PARA_GANAR_DEFAULT): TableroSoccer {
  const { ancho, alto } = CANCHA;
  const fichas: FichaSoccer[] = [
    // j:1 — atrás cerca de su propio arco (y=0), adelante más lejos de él.
    { j: 1, n: 0, x: ancho * 0.35, y: alto * 0.08 },
    { j: 1, n: 1, x: ancho * 0.65, y: alto * 0.08 },
    { j: 1, n: 2, x: ancho * 0.2, y: alto * 0.24 },
    { j: 1, n: 3, x: ancho * 0.5, y: alto * 0.24 },
    { j: 1, n: 4, x: ancho * 0.8, y: alto * 0.24 },
    // j:2 — espejo vertical de lo de arriba.
    { j: 2, n: 0, x: ancho * 0.35, y: alto * 0.92 },
    { j: 2, n: 1, x: ancho * 0.65, y: alto * 0.92 },
    { j: 2, n: 2, x: ancho * 0.2, y: alto * 0.76 },
    { j: 2, n: 3, x: ancho * 0.5, y: alto * 0.76 },
    { j: 2, n: 4, x: ancho * 0.8, y: alto * 0.76 },
  ];
  return {
    fichas,
    pelota: { x: ancho / 2, y: alto / 2 },
    golesJ1: 0,
    golesJ2: 0,
    cancha: CANCHA,
    turnoEmpezoEn: Math.floor(Date.now() / 1000),
    segundosNetosUsados: 0,
    metaGoles: Math.max(GOLES_MIN, Math.min(GOLES_MAX, metaGoles)),
  };
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
 * Rebote elástico contra las 4 paredes — salvo la pelota dentro de la
 * franja del arco, donde hay dos zonas en vez de una pared simple:
 *
 * 1. Campo abierto, o tocó la línea FUERA de la franja del arco: rebote de
 *    banda de siempre (ahí no hay arco).
 * 2. Tocó la línea DENTRO de la franja del arco:
 *    a. Si el borde TRASERO de la pelota ya cruzó esa línea (la pelota
 *       entera ya pasó) → gol, se corta ahí.
 *    b. Si no, sigue de largo sin rebotar — va "entrando" a la red, y una
 *       pelota que ya tocó la línea sólo puede seguir de largo (cruzar del
 *       todo) o frenarse por fricción antes de cruzar (queda en reposo
 *       dentro de la red sin haber sido gol — caso raro y aceptado, ver
 *       plan). Nunca "rebota hacia afuera": un arco de verdad no funciona
 *       así, y las fichas nunca entran a esta zona (no las hay ahí atrás)
 *       así que no hay con qué chocar tampoco.
 *    c. Guard puramente defensivo, no una mecánica real: si por algún
 *       impulso extremo la pelota igual llegara más allá de
 *       `profundidadArco` (mucho más lejos de lo que cualquier tiro
 *       necesita para ya haber sido gol — cruzar entera son sólo
 *       `2*radioPelota`), se la frena en seco ahí (clamp + velocidad en
 *       cero) para que nunca se vaya de la cancha en un caso patológico.
 */
function rebotePared(c: Cuerpo, cancha: Cancha, esPelota: boolean): 1 | 2 | null {
  if (c.pos.x - c.radio < 0) {
    c.pos.x = c.radio;
    c.vel.x = Math.abs(c.vel.x);
  } else if (c.pos.x + c.radio > cancha.ancho) {
    c.pos.x = cancha.ancho - c.radio;
    c.vel.x = -Math.abs(c.vel.x);
  }

  const enFranja = esPelota && dentroDeLaFranjaDelArco(c.pos.x, cancha);
  const fondo = cancha.profundidadArco;

  // Arco de arriba (y=0), gol para j:2.
  if (c.pos.y - c.radio < 0) {
    if (!enFranja) {
      c.pos.y = c.radio;
      c.vel.y = Math.abs(c.vel.y);
      return null;
    }
    if (c.pos.y + c.radio < 0) return 2; // borde trasero ya cruzó: gol
    if (c.pos.y - c.radio <= -fondo) {
      c.pos.y = -fondo + c.radio; // guard defensivo, no una mecánica real
      c.vel = { x: 0, y: 0 };
    }
    return null;
  }

  // Arco de abajo (y=alto), gol para j:1.
  if (c.pos.y + c.radio > cancha.alto) {
    if (!enFranja) {
      c.pos.y = cancha.alto - c.radio;
      c.vel.y = -Math.abs(c.vel.y);
      return null;
    }
    if (c.pos.y - c.radio > cancha.alto) return 1; // borde trasero ya cruzó: gol
    if (c.pos.y + c.radio >= cancha.alto + fondo) {
      c.pos.y = cancha.alto + fondo - c.radio; // guard defensivo, no una mecánica real
      c.vel = { x: 0, y: 0 };
    }
    return null;
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
  //
  // `turnoEmpezoEn`/`segundosNetosUsados` tampoco los toca la física — los
  // decide el servidor al persistir (ver soccer_mover.php), así que viajan
  // sin cambios desde el estado inicial.
  return {
    estadoFinal: {
      fichas,
      pelota: { x: pelotaCuerpo.pos.x, y: pelotaCuerpo.pos.y },
      golesJ1: estadoInicial.golesJ1,
      golesJ2: estadoInicial.golesJ2,
      cancha,
      turnoEmpezoEn: estadoInicial.turnoEmpezoEn,
      segundosNetosUsados: estadoInicial.segundosNetosUsados,
    },
    trayectorias,
    gol,
  };
}
