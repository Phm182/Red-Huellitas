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
  /** El `impulso` del último tiro ya resuelto (nulo antes del primer tiro) — para que el rival pueda reproducir la física real en vez de una interpolación falsa. Ver `pool_mover.php`. */
  ultimoImpulso?: Vector | null;
};

export const MESA: Mesa = { ancho: 300, alto: 600, radioBola: 9, radioTronera: 17 };
export const SEGUNDOS_POR_TURNO = 25;
export const TOPE_SEGUNDOS_NETOS = 240;

// Antes 0.985: frenaba de golpe apenas rebotaba una vez (la caída
// exponencial se notaba en pocos cuadros). Más cerca de 1 estira la
// desaceleración — la bola desliza un poco más, como en una mesa real.
const FRICCION = 0.991;
// Antes 0.04: con fricción puramente multiplicativa, la "cola" final (donde
// la velocidad ya es chica pero todavía no llegó al corte) dura CIENTOS de
// cuadros extra — proporcionalmente mucho más en un tiro fuerte (más cuadros
// totales) que en uno suave. Como la animación (`reproducir()` en
// MesaPool.tsx) reparte un tiempo de pantalla TOPEADO entre todos los
// cuadros por igual, un tiro fuerte con esa cola larga terminaba
// "atropellado": se veía frenar de golpe en vez de ir perdiendo velocidad
// gradual. Subir el corte recorta esa cola por igual en TODOS los tiros
// (en cuadros absolutos, no proporcional), lo cual angosta bastante más el
// hueco entre "cuadros reales" y "tiempo de pantalla" para los tiros
// fuertes — reportado real probando en el celular ("tiro maximo... frena
// brusco, tiros despacio anda bastante mejor").
const VEL_MINIMA = 0.22;
const MAX_FRAMES = 1400;

type Cuerpo = {
  n: number;
  pos: Vector;
  vel: Vector;
  radio: number;
  enMesa: boolean;
  /** Rodadura acumulada (rad) = ∫ |vel|/radio dt. Una esfera que rueda
   * gira este ángulo alrededor del eje perpendicular a su avance; el
   * render (`BolaSkinSvg`) lo usa junto con la dirección de avance para
   * "hacer rodar" el número/franja sobre la cara de la bola, en vez de
   * girarla en el lugar. Puramente visual, no toca la trayectoria. */
  rod: number;
  /** Cuadros que lleva "cayendo" dentro de una tronera (ver más abajo). 0 =
   * todavía no entró a ninguna. */
  cayendoDesde: number;
};

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

/** La tronera cuya boca (radio real, la misma que valida el servidor)
 * contiene este punto, o `null` si no hay ninguna. */
function troneraDeBoca(pos: Vector, mesa: Mesa): Vector | null {
  for (const t of troneras(mesa)) {
    if (magnitud({ x: pos.x - t.x, y: pos.y - t.y }) <= mesa.radioTronera) return t;
  }
  return null;
}

/** Cuánto se frena una bola DENTRO del pozo de la tronera — mucho más que en
 * el paño: está cayendo, no rodando. */
const FRICCION_POZO = 0.82;
/** Radio del "pozo" interior contra el que rebota si entra fuerte — más
 * chico que la boca visual, así una bola rápida pega contra la pared de
 * adentro en vez de atravesarla de largo. */
const RADIO_POZO_FRAC = 0.5;
/** Cuadros máximo que se la deja "cayendo" antes de darla por hundida de
 * una vez, aunque no haya perdido toda la velocidad — guard anti-cuelgue,
 * nunca debería llegar acá con `FRICCION_POZO` tan baja. */
const MAX_CUADROS_CAYENDO = 40;

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
      rod: 0,
      cayendoDesde: 0,
    }));
}

/** Rebote elástico contra las 4 bandas — sin excepción de zona, a diferencia
 * de HueSoccer (acá no hay arco). La rodadura no se toca acá: cambia sola en
 * el frame siguiente porque la velocidad ya viene invertida. */
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

/** Colisión elástica entre dos círculos de masa igual — idéntica a la de
 * HueSoccer. La rodadura no se transfiere: cada bola rueda según su propia
 * velocidad, y como la colisión ya se la cambió, en el frame siguiente la
 * rodadura arranca a girar en la dirección nueva sola. */
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

/** Un punto de trayectoria grabado: posición + rodadura acumulada en ese
 * instante. Puramente interno del cliente — nunca se serializa al backend
 * (sólo `estadoFinal` viaja), así que este shape es libre de cambiar. La
 * dirección de rodadura la deriva `reproducir()` del delta de posición
 * entre puntos consecutivos, no hace falta guardarla. */
export type PuntoTrayectoria = { pos: Vector; rod: number };

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
  for (const c of cuerpos) trayectorias[c.n] = [{ pos: { ...c.pos }, rod: c.rod }];

  const embocadasEsteTiro: number[] = [];

  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    let algoEnMovimiento = false;

    for (const c of cuerpos) {
      if (!c.enMesa) continue;

      const cayendo = c.cayendoDesde > 0;
      const friccion = cayendo ? FRICCION_POZO : FRICCION;

      if (magnitud(c.vel) <= VEL_MINIMA) {
        c.vel = { x: 0, y: 0 };
      } else {
        algoEnMovimiento = true;
        c.pos.x += c.vel.x;
        c.pos.y += c.vel.y;
        c.vel.x *= friccion;
        c.vel.y *= friccion;
        // Rodadura: una esfera que avanza `d` píxeles rueda `d/radio` rad.
        c.rod += magnitud(c.vel) / c.radio;
      }

      if (!cayendo) {
        // Recién entra a la boca: a partir de acá deja de rebotar contra
        // las bandas (ya está "adentro" del agujero) y pasa a la física del
        // pozo, más abajo. Antes esto sacaba la bola de la mesa de una, sin
        // dejarla avanzar más — llegaba y se quedaba tildada en el borde de
        // la boca en vez de caer, y si venía fuerte no pasaba nada especial.
        const boca = troneraDeBoca(c.pos, mesa);
        if (boca) {
          c.cayendoDesde = frame + 1; // > 0 marca "cayendo" desde el próximo cuadro
        } else {
          rebotePared(c, mesa);
        }
        continue;
      }

      // Dentro del pozo: la tronera más cercana (no cambia mientras cae).
      const pozo = troneraDeBoca(c.pos, mesa) ?? troneras(mesa).reduce((a, b) =>
        magnitud({ x: c.pos.x - a.x, y: c.pos.y - a.y }) <= magnitud({ x: c.pos.x - b.x, y: c.pos.y - b.y }) ? a : b
      );
      const dx = c.pos.x - pozo.x;
      const dy = c.pos.y - pozo.y;
      const dist = magnitud({ x: dx, y: dy });
      const radioPozo = mesa.radioTronera * RADIO_POZO_FRAC;
      if (dist > radioPozo && dist > 0) {
        // Rebote elástico contra la pared interior del pozo — si viene
        // fuerte, pega y vuelve hacia el centro en vez de atravesar de
        // largo. Mismo cálculo que `rebotePared`, pero circular.
        const nx = dx / dist;
        const ny = dy / dist;
        c.pos.x = pozo.x + nx * radioPozo;
        c.pos.y = pozo.y + ny * radioPozo;
        const velNormal = c.vel.x * nx + c.vel.y * ny;
        if (velNormal > 0) {
          c.vel.x -= 2 * velNormal * nx;
          c.vel.y -= 2 * velNormal * ny;
        }
      }

      const yaSeAsento = magnitud(c.vel) <= VEL_MINIMA * 3;
      const seAcabaElTiempo = frame - c.cayendoDesde >= MAX_CUADROS_CAYENDO;
      if (yaSeAsento || seAcabaElTiempo) {
        // Última posición: bien adentro del pozo (dentro de `radioTronera`,
        // que es lo que valida `rh_pool_embocada()` en el servidor), nunca
        // en el borde de la boca.
        c.pos.x = pozo.x;
        c.pos.y = pozo.y;
        c.enMesa = false;
        c.vel = { x: 0, y: 0 };
        embocadasEsteTiro.push(c.n);
      }
    }

    const activos = cuerpos.filter((c) => c.enMesa && c.cayendoDesde === 0);
    for (let i = 0; i < activos.length; i++) {
      for (let j = i + 1; j < activos.length; j++) {
        resolverColision(activos[i]!, activos[j]!);
      }
    }

    for (const c of cuerpos) trayectorias[c.n]!.push({ pos: { ...c.pos }, rod: c.rod });
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
