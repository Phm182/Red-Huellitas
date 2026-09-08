/**
 * Motor de física de HuePool. Lógica pura, sin React ni dibujo.
 *
 * Mismo criterio que `huesoccer/motor.ts` (ver su comentario de cabecera):
 * loop de física a mano, sin ninguna librería — fricción multiplicativa,
 * rebote elástico en las bandas, colisión elástica entre círculos de masa
 * igual. Acá se le suman las troneras: una bola cuyo centro entra al radio
 * de una tronera se saca de la mesa (no rebota, no sigue de largo).
 *
 * A diferencia de HueSoccer, acá SIEMPRE se le pega a la bola blanca (n=0):
 * las demás bolas nunca reciben un impulso directo del jugador, sólo por
 * colisión — por eso `simularTiro()` no recibe "a qué bola pegarle".
 */

export type Vector = { x: number; y: number };
export type Mesa = { ancho: number; alto: number; radioBola: number; radioTronera: number };
export type Bola = { n: number; x: number; y: number; enMesa: boolean };
export type TableroPool = {
  bolas: Bola[];
  mesa: Mesa;
  grupoJ1: 'lisas' | 'rayadas' | null;
  grupoJ2: 'lisas' | 'rayadas' | null;
  /** Si el próximo tiro puede arrancar con la blanca en cualquier lado de la mesa (falta del rival). */
  bolaEnMano: boolean;
  turnoEmpezoEn: number;
  segundosNetosUsados: number;
};

export const MESA: Mesa = { ancho: 300, alto: 600, radioBola: 9, radioTronera: 17 };
export const SEGUNDOS_POR_TURNO = 25;
export const TOPE_SEGUNDOS_NETOS = 240;

const FRICCION = 0.985;
const VEL_MINIMA = 0.04;
const MAX_FRAMES = 900;

type Cuerpo = { n: number; pos: Vector; vel: Vector; radio: number; enMesa: boolean };

function magnitud(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** El grupo de cada bola: lisas 1-7, rayadas 9-15, la 8 y la blanca (0) no son de ningún grupo. */
export function grupoDe(n: number): 'lisas' | 'rayadas' | null {
  if (n >= 1 && n <= 7) return 'lisas';
  if (n >= 9 && n <= 15) return 'rayadas';
  return null;
}

function troneras(mesa: Mesa): Vector[] {
  const { ancho, alto } = mesa;
  return [
    { x: 0, y: 0 }, { x: ancho / 2, y: 0 }, { x: ancho, y: 0 },
    { x: 0, y: alto }, { x: ancho / 2, y: alto }, { x: ancho, y: alto },
  ];
}

/** ¿El centro de la bola cae dentro de una tronera? Misma regla que `rh_pool_embocada()` en el backend. */
function estaEmbocada(pos: Vector, mesa: Mesa): boolean {
  return troneras(mesa).some((t) => magnitud({ x: pos.x - t.x, y: pos.y - t.y }) <= mesa.radioTronera);
}

/**
 * Tablero inicial: triángulo de 15 bolas con la 8 en el centro exacto y una
 * lisa + una rayada en las esquinas de atrás. Mismo shape EXACTO que
 * `rh_pool_inicial()` en el backend — tienen que coincidir.
 */
export function tableroInicial(): TableroPool {
  const { ancho, alto, radioBola } = MESA;
  const cx = ancho / 2;
  const espaciado = radioBola * 2 + 0.5;
  const alturaFila = (espaciado * Math.sqrt(3)) / 2;
  const yApice = alto * 0.28;

  const numeracion = [
    [2],
    [3, 10],
    [4, 8, 11],
    [5, 12, 6, 13],
    [1, 14, 7, 15, 9],
  ];

  const bolas: Bola[] = [{ n: 0, x: cx, y: alto * 0.82, enMesa: true }];
  numeracion.forEach((fila, f) => {
    const y = yApice - f * alturaFila;
    fila.forEach((numero, i) => {
      const x = cx + (i - (fila.length - 1) / 2) * espaciado;
      bolas.push({ n: numero, x, y, enMesa: true });
    });
  });
  bolas.sort((a, b) => a.n - b.n);

  return {
    bolas,
    mesa: MESA,
    grupoJ1: null,
    grupoJ2: null,
    bolaEnMano: false,
    turnoEmpezoEn: Math.floor(Date.now() / 1000),
    segundosNetosUsados: 0,
  };
}

function aCuerpos(t: TableroPool): Cuerpo[] {
  return t.bolas
    .filter((b) => b.enMesa)
    .map((b) => ({ n: b.n, pos: { x: b.x, y: b.y }, vel: { x: 0, y: 0 }, radio: t.mesa.radioBola, enMesa: true }));
}

/** Rebote elástico contra las 4 bandas — sin excepción de zona, a diferencia de HueSoccer (acá no hay arco). */
function rebotePared(c: Cuerpo, mesa: Mesa): void {
  if (c.pos.x - c.radio < 0) {
    c.pos.x = c.radio;
    c.vel.x = Math.abs(c.vel.x);
  } else if (c.pos.x + c.radio > mesa.ancho) {
    c.pos.x = mesa.ancho - c.radio;
    c.vel.x = -Math.abs(c.vel.x);
  }
  if (c.pos.y - c.radio < 0) {
    c.pos.y = c.radio;
    c.vel.y = Math.abs(c.vel.y);
  } else if (c.pos.y + c.radio > mesa.alto) {
    c.pos.y = mesa.alto - c.radio;
    c.vel.y = -Math.abs(c.vel.y);
  }
}

/** Colisión elástica entre dos círculos de masa igual — idéntica a la de HueSoccer. */
function resolverColision(a: Cuerpo, b: Cuerpo): void {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radio + b.radio;
  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const solape = minDist - dist;
  a.pos.x -= (nx * solape) / 2;
  a.pos.y -= (ny * solape) / 2;
  b.pos.x += (nx * solape) / 2;
  b.pos.y += (ny * solape) / 2;

  const velA = a.vel.x * nx + a.vel.y * ny;
  const velB = b.vel.x * nx + b.vel.y * ny;
  if (velB - velA > 0) return;

  a.vel.x += (velB - velA) * nx;
  a.vel.y += (velB - velA) * ny;
  b.vel.x += (velA - velB) * nx;
  b.vel.y += (velA - velB) * ny;
}

export type ResultadoTiroPool = {
  estadoFinal: TableroPool;
  trayectorias: Record<number, Vector[]>;
  /** Números de bola que se embocaron en ESTE tiro (la blanca incluida si fue falta). */
  embocadasEsteTiro: number[];
};

/**
 * Simula un tiro completo: le pega a la blanca con `impulso` y corre el loop
 * hasta que todo llega a reposo o se alcanza `MAX_FRAMES` (guard
 * anti-cuelgue). Determinístico: mismo estado + mismo impulso = mismo
 * resultado, siempre.
 */
export function simularTiro(estadoInicial: TableroPool, impulso: Vector): ResultadoTiroPool {
  const mesa = estadoInicial.mesa;
  const cuerpos = aCuerpos(estadoInicial);
  const blanca = cuerpos.find((c) => c.n === 0);
  if (blanca) {
    blanca.vel.x = impulso.x;
    blanca.vel.y = impulso.y;
  }

  const trayectorias: Record<number, Vector[]> = {};
  for (const c of cuerpos) trayectorias[c.n] = [{ ...c.pos }];

  const embocadasEsteTiro: number[] = [];

  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    let algoEnMovimiento = false;

    for (const c of cuerpos) {
      if (!c.enMesa) continue;
      if (magnitud(c.vel) <= VEL_MINIMA) {
        c.vel = { x: 0, y: 0 };
      } else {
        algoEnMovimiento = true;
        c.pos.x += c.vel.x;
        c.pos.y += c.vel.y;
        c.vel.x *= FRICCION;
        c.vel.y *= FRICCION;
      }

      if (estaEmbocada(c.pos, mesa)) {
        c.enMesa = false;
        c.vel = { x: 0, y: 0 };
        embocadasEsteTiro.push(c.n);
        continue;
      }
      rebotePared(c, mesa);
    }

    const activos = cuerpos.filter((c) => c.enMesa);
    for (let i = 0; i < activos.length; i++) {
      for (let j = i + 1; j < activos.length; j++) {
        resolverColision(activos[i]!, activos[j]!);
      }
    }

    for (const c of cuerpos) trayectorias[c.n]!.push({ ...c.pos });
    if (!algoEnMovimiento) break;
  }

  const bolas: Bola[] = estadoInicial.bolas.map((b) => {
    if (!b.enMesa) return b; // ya estaba embocada de antes, no la toca la física
    const c = cuerpos.find((cu) => cu.n === b.n)!;
    return { n: b.n, x: c.pos.x, y: c.pos.y, enMesa: c.enMesa };
  });

  return {
    estadoFinal: {
      bolas,
      mesa,
      grupoJ1: estadoInicial.grupoJ1,
      grupoJ2: estadoInicial.grupoJ2,
      bolaEnMano: estadoInicial.bolaEnMano,
      turnoEmpezoEn: estadoInicial.turnoEmpezoEn,
      segundosNetosUsados: estadoInicial.segundosNetosUsados,
    },
    trayectorias,
    embocadasEsteTiro,
  };
}
