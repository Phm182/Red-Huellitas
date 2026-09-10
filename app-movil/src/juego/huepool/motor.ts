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
/** Cuánto se acerca el giro visual al "giro de rueda" (vel/radio) en cada
 * frame — 1 sería instantáneo, un valor bajo lo suaviza para que no salte
 * de golpe apenas arranca a moverse. */
const SUAVIZADO_GIRO = 0.15;
/** Cuánto giro le mete un choque de lleno (bola-bola) por unidad de
 * velocidad tangencial relativa — ajustado a ojo para que "se sienta"
 * sin quedar patológico. */
const TORQUE_COLISION = 0.5;
/** Ídem para un rebote en banda. */
const TORQUE_BANDA = 0.3;
/** Tope de velocidad angular (rad/frame) — sin esto un choque muy fuerte
 * podía dejar una bola girando a una velocidad absurda. */
const VEL_ANGULAR_MAX = 1.2;

type Cuerpo = {
  n: number;
  pos: Vector;
  vel: Vector;
  radio: number;
  enMesa: boolean;
  /** Ángulo acumulado (rad, sin wrap) — puramente visual, no afecta la
   * trayectoria. Ver comentario de `simularTiro` sobre por qué esto es
   * "creíble" y no billar realista (sin efecto/inglés real). */
  angulo: number;
  velAngular: number;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function magnitud(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** El grupo de cada bola: lisas 1-7, rayadas 9-15, la 8 y la blanca (0) no son de ningún grupo. */
export function grupoDe(n: number): 'lisas' | 'rayadas' | null {
  if (n >= 1 && n <= 7) return 'lisas';
  if (n >= 9 && n <= 15) return 'rayadas';
  return null;
}

/** Las 6 troneras: 4 esquinas + los 2 medios de BANDA LARGA — en esta mesa
 * (más alta que ancha) la banda larga es la izquierda/derecha, no la de
 * arriba/abajo. Bug real encontrado probando en el celular: acá estaban en
 * el medio de arriba/abajo (banda CORTA) — mismo error que tenía
 * `rh_pool_troneras()` en el backend (`inc/funciones/pool.php`), hay que
 * arreglar los dos juntos o el cliente y el servidor dejan de coincidir en
 * qué tiro embocó una bola. */
function troneras(mesa: Mesa): Vector[] {
  const { ancho, alto } = mesa;
  return [
    { x: 0, y: 0 }, { x: ancho, y: 0 },
    { x: 0, y: alto / 2 }, { x: ancho, y: alto / 2 },
    { x: 0, y: alto }, { x: ancho, y: alto },
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
    .map((b) => ({
      n: b.n,
      pos: { x: b.x, y: b.y },
      vel: { x: 0, y: 0 },
      radio: t.mesa.radioBola,
      enMesa: true,
      angulo: 0,
      velAngular: 0,
    }));
}

/** Rebote elástico contra las 4 bandas — sin excepción de zona, a diferencia de HueSoccer (acá no hay arco).
 * Además le suma un poco de giro con la componente de velocidad TANGENCIAL
 * al borde (la que no se invierte) — un rebote de costado sale girando
 * distinto que uno de lleno, se siente más reactivo. */
function rebotePared(c: Cuerpo, mesa: Mesa): void {
  if (c.pos.x - c.radio < 0) {
    c.pos.x = c.radio;
    c.vel.x = Math.abs(c.vel.x);
    c.velAngular = clamp(c.velAngular + (c.vel.y * TORQUE_BANDA) / c.radio, -VEL_ANGULAR_MAX, VEL_ANGULAR_MAX);
  } else if (c.pos.x + c.radio > mesa.ancho) {
    c.pos.x = mesa.ancho - c.radio;
    c.vel.x = -Math.abs(c.vel.x);
    c.velAngular = clamp(c.velAngular + (c.vel.y * TORQUE_BANDA) / c.radio, -VEL_ANGULAR_MAX, VEL_ANGULAR_MAX);
  }
  if (c.pos.y - c.radio < 0) {
    c.pos.y = c.radio;
    c.vel.y = Math.abs(c.vel.y);
    c.velAngular = clamp(c.velAngular + (c.vel.x * TORQUE_BANDA) / c.radio, -VEL_ANGULAR_MAX, VEL_ANGULAR_MAX);
  } else if (c.pos.y + c.radio > mesa.alto) {
    c.pos.y = mesa.alto - c.radio;
    c.vel.y = -Math.abs(c.vel.y);
    c.velAngular = clamp(c.velAngular + (c.vel.x * TORQUE_BANDA) / c.radio, -VEL_ANGULAR_MAX, VEL_ANGULAR_MAX);
  }
}

/** Colisión elástica entre dos círculos de masa igual — idéntica a la de
 * HueSoccer. Además transfiere un poco de giro entre las dos (torque de
 * choque): la componente TANGENCIAL de la velocidad relativa (la que la
 * colisión normal no toca) se convierte en un cambio de velocidad angular
 * para cada una, en sentidos opuestos — un choque de lleno gira poco, uno
 * de costado gira más, y las dos bolas quedan girando distinto entre sí.
 * No es billar realista (sin efecto/inglés real transferido por fricción
 * de contacto de verdad) — es sólo "se ve físico y reactivo", que es lo
 * pedido. */
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

  // Torque: con la velocidad relativa DE ANTES del intercambio (si no, ya
  // no queda componente tangencial que leer una vez resuelta la normal).
  const tx = -ny;
  const ty = nx;
  const velRelTang = (b.vel.x - a.vel.x) * tx + (b.vel.y - a.vel.y) * ty;
  const radioProm = (a.radio + b.radio) / 2;
  const impulsoAngular = (velRelTang * TORQUE_COLISION) / radioProm;
  a.velAngular = clamp(a.velAngular - impulsoAngular, -VEL_ANGULAR_MAX, VEL_ANGULAR_MAX);
  b.velAngular = clamp(b.velAngular + impulsoAngular, -VEL_ANGULAR_MAX, VEL_ANGULAR_MAX);

  const velA = a.vel.x * nx + a.vel.y * ny;
  const velB = b.vel.x * nx + b.vel.y * ny;
  if (velB - velA > 0) return;

  a.vel.x += (velB - velA) * nx;
  a.vel.y += (velB - velA) * ny;
  b.vel.x += (velA - velB) * nx;
  b.vel.y += (velA - velB) * ny;
}

/** Un punto de trayectoria grabado: posición + ángulo de giro visual en ese
 * instante. Puramente interno del cliente — nunca se serializa al backend
 * (sólo `estadoFinal` viaja), así que este shape es libre de cambiar. */
export type PuntoTrayectoria = { pos: Vector; angulo: number };

export type ResultadoTiroPool = {
  estadoFinal: TableroPool;
  trayectorias: Record<number, PuntoTrayectoria[]>;
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

  const trayectorias: Record<number, PuntoTrayectoria[]> = {};
  for (const c of cuerpos) trayectorias[c.n] = [{ pos: { ...c.pos }, angulo: c.angulo }];

  const embocadasEsteTiro: number[] = [];

  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    let algoEnMovimiento = false;

    for (const c of cuerpos) {
      if (!c.enMesa) continue;
      if (magnitud(c.vel) <= VEL_MINIMA) {
        c.vel = { x: 0, y: 0 };
        c.velAngular *= FRICCION; // el giro se apaga junto con la traslación, no de golpe
      } else {
        algoEnMovimiento = true;
        c.pos.x += c.vel.x;
        c.pos.y += c.vel.y;
        c.vel.x *= FRICCION;
        c.vel.y *= FRICCION;
        // Rolling: converge hacia el giro "natural" de una rueda a esa
        // velocidad (vel/radio), suavizado para no saltar de golpe.
        const velAngularObjetivo = magnitud(c.vel) / c.radio;
        c.velAngular += (velAngularObjetivo - c.velAngular) * SUAVIZADO_GIRO;
        c.velAngular *= FRICCION;
      }
      c.angulo += c.velAngular;

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

    for (const c of cuerpos) trayectorias[c.n]!.push({ pos: { ...c.pos }, angulo: c.angulo });
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
