/**
 * Motor de HuePacMan. Lógica pura, sin React ni dibujo — primer juego de
 * HuePlay en tiempo real (todos los demás son por turnos o cliente con
 * semilla pero sin loop en vivo, ver `src/juego/huematch/motor.ts` etc).
 *
 * Laberinto FIJO (no procedural, por pedido del plan) — se generó una única
 * vez con un script aparte (laberinto perfecto + unos loops extra + espejado
 * izquierda/derecha + verificación de que todo tile transitable se alcanza
 * desde el spawn) y quedó pegado acá como texto: es más chico que el
 * 28x31 clásico de arcade (17x21) para poder garantizar que no tiene
 * callejones rotos ni typos de tipeo a mano, pero mismo lenguaje (túnel
 * lateral, casa de fantasmas al centro, power-pellets en las 4 esquinas).
 *
 * Movimiento tipo arcade clásico: cada entidad (Pac-Man o fantasma) vive en
 * un tile con una dirección y un "progreso" (0..1) hacia el próximo tile en
 * esa dirección — nunca se mueve libre en píxeles. Un giro pedido ANTES de
 * llegar a una esquina queda guardado y se aplica recién al llegar de lleno
 * (nunca atraviesa una pared); una reversa (pedir la dirección opuesta a la
 * actual) es SIEMPRE instantánea, sin esperar al centro del tile — es lo que
 * hace sentir "arcade" en vez de "en rieles".
 */

export type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';
export type PerfilFantasma = 'perseguidor' | 'emboscador' | 'patrulla';
export type EstadoFantasma = 'normal' | 'asustado' | 'comido';

export const DIRS: Record<Direccion, { dx: number; dy: number }> = {
  arriba: { dx: 0, dy: -1 },
  abajo: { dx: 0, dy: 1 },
  izquierda: { dx: -1, dy: 0 },
  derecha: { dx: 1, dy: 0 },
};
export const OPUESTA: Record<Direccion, Direccion> = {
  arriba: 'abajo',
  abajo: 'arriba',
  izquierda: 'derecha',
  derecha: 'izquierda',
};

/**
 * Laberinto fijo — ver comentario de cabecera. `#`=pared, `.`=punto,
 * `o`=power-pellet, ` `=camino sin punto (casa de fantasmas y su puerta),
 * `P`=spawn de Pac-Man. Fila del medio (índice 10) abierta en ambos bordes:
 * es el túnel lateral.
 */
const MAZE: string[] = [
  '#################',
  '#.#.....#.....#.#',
  '#o###.#.#.#.###o#',
  '#...#.#.#.#.#...#',
  '###.#.#.#.#.#.###',
  '#.#.....#.....#.#',
  '#.#.###.#.###.#.#',
  '#....##  ###....#',
  '#.####     ####.#',
  '#...##     ##...#',
  '..#.##     ##.#..',
  '#.#..#     #..#.#',
  '#.#.#########.#.#',
  '#...#...#...#...#',
  '#.#.###P#.###.#.#',
  '#.....#.#.#.....#',
  '#.###.#.#.#.###.#',
  '#.o.....#.....o.#',
  '###.#########.###',
  '#.......#.......#',
  '#################',
];

export const ANCHO = MAZE[0]!.length;
export const ALTO = MAZE.length;

export const VEL_PACMAN = 6.2;
export const VEL_FANTASMA_NORMAL = 5.2;
export const VEL_FANTASMA_ASUSTADO = 3.2;
export const VEL_FANTASMA_COMIDO = 9.5;
export const SEGUNDOS_ASUSTADO = 7;
const SEGUNDOS_PAUSA_RESPAWN = 1.2;
const PUNTOS_DOT = 10;
const PUNTOS_PELLET = 50;
/** Distancia (en tiles) por debajo de la cual Pac-Man y un fantasma "se
 * tocan" — visual, no exacta a pixel (ver `posicionVisual`). */
const RADIO_COLISION = 0.6;
const VIDAS_INICIALES = 3;
/** Cuántos tiles adelante de Pac-Man apunta el emboscador (perfil 'rosa'). */
const TILES_EMBOSCADA = 4;
/** A qué distancia (tiles) el patrulla deja de perseguir y se va a su esquina fija. */
const DISTANCIA_PATRULLA = 8;

export type Entidad = {
  /** Último tile en el que la entidad entró de lleno (progreso volvió a 0 ahí). */
  tileX: number;
  tileY: number;
  dir: Direccion | null;
  /** 0..1: cuánto avanzó desde `tileX,tileY` hacia `tileX+dx, tileY+dy` en `dir`. */
  progreso: number;
};

export type FantasmaEstado = Entidad & {
  id: PerfilFantasma;
  color: string;
  estado: EstadoFantasma;
};

export type EstadoJuego = {
  paredes: boolean[][];
  ancho: number;
  alto: number;
  puntos: Set<string>;
  pellets: Set<string>;
  casaFantasmas: { x: number; y: number };
  esquinaPatrulla: { x: number; y: number };
  spawnPacman: { x: number; y: number };
  spawnsFantasmas: { x: number; y: number }[];
  pacman: Entidad & { dirDeseada: Direccion | null };
  fantasmas: FantasmaEstado[];
  puntaje: number;
  vidas: number;
  /** Fantasmas comidos en la racha actual de un mismo power-pellet — se
   * resetea al activarse uno nuevo o al terminar el efecto. */
  combo: number;
  /** Segundos restantes de power-pellet activo (0 = fantasmas en modo normal). */
  asustadoRestante: number;
  /** Segundos restantes de la pausa tras perder una vida (nadie se mueve). */
  pausaRespawn: number;
  terminado: boolean;
  /** Sólo válido si `terminado`: laberinto limpio (true) o se acabaron las vidas (false). */
  gano: boolean;
  duracionSegundos: number;
};

function clave(x: number, y: number): string {
  return `${x},${y}`;
}

function envolverX(x: number, ancho: number): number {
  if (x < 0) return ancho - 1;
  if (x >= ancho) return 0;
  return x;
}

/** ¿Se puede pisar ese tile? Pared = no; cualquier otra cosa (punto, pellet,
 * camino vacío, casa de fantasmas, spawn) = sí — no hay tiles exclusivos de
 * fantasma: simplificación a propósito (ver comentario en `crearEstadoInicial`). */
export function esCaminoValido(paredes: boolean[][], ancho: number, x: number, y: number): boolean {
  if (y < 0 || y >= paredes.length) return false;
  const tx = envolverX(x, ancho);
  return !paredes[y]![tx];
}

function tileInteriorMasCercano(interior: { x: number; y: number }[], x: number, y: number): { x: number; y: number } {
  let mejor = interior[0]!;
  let mejorD = Infinity;
  for (const p of interior) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < mejorD) {
      mejorD = d;
      mejor = p;
    }
  }
  return mejor;
}

function parsearLaberinto() {
  const paredes: boolean[][] = [];
  const puntos = new Set<string>();
  const pellets = new Set<string>();
  const interior: { x: number; y: number }[] = [];
  let spawnPacman = { x: 0, y: 0 };

  for (let y = 0; y < ALTO; y++) {
    const fila: boolean[] = [];
    for (let x = 0; x < ANCHO; x++) {
      const c = MAZE[y]![x]!;
      fila.push(c === '#');
      if (c === '.') puntos.add(clave(x, y));
      else if (c === 'o') pellets.add(clave(x, y));
      else if (c === 'P') spawnPacman = { x, y };
      else if (c === ' ') interior.push({ x, y });
    }
    paredes.push(fila);
  }

  const cxProm = interior.reduce((s, p) => s + p.x, 0) / interior.length;
  const cyProm = interior.reduce((s, p) => s + p.y, 0) / interior.length;
  const casaFantasmas = tileInteriorMasCercano(interior, cxProm, cyProm);

  // 3 lugares de arranque, uno al lado del otro dentro de la casa — si por
  // algún cambio futuro del laberinto el vecino exacto no fuera parte del
  // interior, cae de vuelta al centro (nunca explota).
  const vecino = (dx: number) => interior.find((p) => p.x === casaFantasmas.x + dx && p.y === casaFantasmas.y) ?? casaFantasmas;
  const spawnsFantasmas = [vecino(-1), casaFantasmas, vecino(1)];

  // Esquina fija del perfil 'patrulla': el punto transitable más cercano a
  // la esquina superior-izquierda real del laberinto.
  let esquinaPatrulla = { x: 1, y: 1 };
  let mejorD = Infinity;
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      if (paredes[y]![x]) continue;
      const d = x * x + y * y;
      if (d < mejorD) {
        mejorD = d;
        esquinaPatrulla = { x, y };
      }
    }
  }

  return { paredes, puntos: puntos, pellets, spawnPacman, casaFantasmas, spawnsFantasmas, esquinaPatrulla };
}

/** Los puntos/pellets restantes son ESTADO de la partida (se comen), así que
 * cada `crearEstadoInicial()` parte de una copia fresca del layout fijo —
 * `parsearLaberinto()` es barato (357 tiles) y se puede llamar en cada
 * partida nueva sin problema. */
export function crearEstadoInicial(): EstadoJuego {
  const l = parsearLaberinto();
  const colores: Record<PerfilFantasma, string> = {
    perseguidor: '#E8362C',
    emboscador: '#F2A0D0',
    patrulla: '#F0A830',
  };
  const perfiles: PerfilFantasma[] = ['perseguidor', 'emboscador', 'patrulla'];

  return {
    paredes: l.paredes,
    ancho: ANCHO,
    alto: ALTO,
    puntos: l.puntos,
    pellets: l.pellets,
    casaFantasmas: l.casaFantasmas,
    esquinaPatrulla: l.esquinaPatrulla,
    spawnPacman: l.spawnPacman,
    spawnsFantasmas: l.spawnsFantasmas,
    pacman: { tileX: l.spawnPacman.x, tileY: l.spawnPacman.y, dir: null, progreso: 0, dirDeseada: null },
    fantasmas: perfiles.map((id, i) => ({
      id,
      color: colores[id],
      estado: 'normal',
      tileX: l.spawnsFantasmas[i]!.x,
      tileY: l.spawnsFantasmas[i]!.y,
      dir: null,
      progreso: 0,
    })),
    puntaje: 0,
    vidas: VIDAS_INICIALES,
    combo: 0,
    asustadoRestante: 0,
    pausaRespawn: 0,
    terminado: false,
    gano: false,
    duracionSegundos: 0,
  };
}

/** Posición continua (en unidades de tile) de una entidad — la misma cuenta
 * que usa la detección de colisión y que debe usar el render (`TableroPacman`)
 * para que lo que se ve coincida exactamente con lo que decide el motor. */
export function posicionVisual(e: Entidad): { x: number; y: number } {
  if (!e.dir) return { x: e.tileX, y: e.tileY };
  const d = DIRS[e.dir];
  return { x: e.tileX + d.dx * e.progreso, y: e.tileY + d.dy * e.progreso };
}

/**
 * Avanza una entidad genérica (Pac-Man o fantasma) `dt` segundos a
 * `velTiles` tiles/segundo, aplicando la dirección deseada en cuanto sea
 * válida (al centro de un tile, o instantáneo si es la reversa exacta de
 * `dir`).
 *
 * `obtenerDireccion` es un CALLBACK, no un valor ya calculado — se lo llama
 * de nuevo justo al llegar de lleno a cada tile nuevo (adentro del
 * `while`), leyendo en ese momento `e.tileX/e.tileY` YA actualizados. Es
 * imprescindible para la IA de los fantasmas: si se le pasara un valor fijo
 * calculado ANTES de mover (como en la primera versión de este archivo,
 * bug real encontrado con `scripts/tmp_bfs_debug.ts` + `tmp_trace.ts`), la
 * decisión de "para qué lado doblar" quedaba anclada al tile de SALIDA en
 * vez del tile de LLEGADA — un fantasma que debía doblar en una esquina
 * seguía derecho, porque la única dirección que se probaba en ese instante
 * era la que ya tenía calculada un tile antes (mismo lugar de donde salió,
 * no donde llegó). Para Pac-Man el callback simplemente lee
 * `estado.pacman.dirDeseada` cada vez — no depende de la posición, así que
 * llamarlo de más no cambia nada.
 */
function avanzarEntidad(e: Entidad, obtenerDireccion: () => Direccion | null, paredes: boolean[][], ancho: number, velTiles: number, dt: number): void {
  let dirDeseada = obtenerDireccion();

  // Reversa instantánea a mitad de camino: se "da vuelta" en el punto exacto
  // donde está (ver comentario de cabecera), sin esperar al centro del tile.
  if (dirDeseada && e.dir && e.progreso > 0 && dirDeseada === OPUESTA[e.dir]) {
    const d = DIRS[e.dir];
    e.tileX = envolverX(e.tileX + d.dx, ancho);
    e.tileY = e.tileY + d.dy;
    e.progreso = 1 - e.progreso;
    e.dir = dirDeseada;
  }

  if (e.progreso === 0) {
    if (dirDeseada && esCaminoValido(paredes, ancho, e.tileX + DIRS[dirDeseada].dx, e.tileY + DIRS[dirDeseada].dy)) {
      e.dir = dirDeseada;
    } else if (e.dir && !esCaminoValido(paredes, ancho, e.tileX + DIRS[e.dir].dx, e.tileY + DIRS[e.dir].dy)) {
      e.dir = null;
    }
  }

  if (!e.dir) return;
  if (!esCaminoValido(paredes, ancho, e.tileX + DIRS[e.dir].dx, e.tileY + DIRS[e.dir].dy)) {
    e.dir = null;
    return;
  }

  e.progreso += velTiles * dt;
  while (e.progreso >= 1) {
    const d = DIRS[e.dir];
    e.tileX = envolverX(e.tileX + d.dx, ancho);
    e.tileY = e.tileY + d.dy;
    e.progreso -= 1;
    // Recién llegado de lleno a un tile nuevo: se vuelve a preguntar (no se
    // reusa la respuesta de arriba, calculada para el tile de SALIDA) — ver
    // el comentario largo de la función.
    dirDeseada = obtenerDireccion();
    if (dirDeseada && esCaminoValido(paredes, ancho, e.tileX + DIRS[dirDeseada].dx, e.tileY + DIRS[dirDeseada].dy)) {
      e.dir = dirDeseada;
    } else if (!esCaminoValido(paredes, ancho, e.tileX + d.dx, e.tileY + d.dy)) {
      e.dir = null;
      e.progreso = 0;
      break;
    }
  }
}

function reposicionarTrasVida(estado: EstadoJuego): void {
  estado.pacman.tileX = estado.spawnPacman.x;
  estado.pacman.tileY = estado.spawnPacman.y;
  estado.pacman.dir = null;
  estado.pacman.progreso = 0;
  estado.pacman.dirDeseada = null;

  estado.fantasmas.forEach((f, i) => {
    const s = estado.spawnsFantasmas[i]!;
    f.tileX = s.x;
    f.tileY = s.y;
    f.dir = null;
    f.progreso = 0;
    f.estado = 'normal';
  });

  estado.asustadoRestante = 0;
  estado.combo = 0;
}

function perderVida(estado: EstadoJuego): void {
  estado.vidas -= 1;
  if (estado.vidas <= 0) {
    estado.terminado = true;
    estado.gano = false;
    return;
  }
  reposicionarTrasVida(estado);
  estado.pausaRespawn = SEGUNDOS_PAUSA_RESPAWN;
}

function detectarColisiones(estado: EstadoJuego): void {
  const pPac = posicionVisual(estado.pacman);
  for (const f of estado.fantasmas) {
    if (f.estado === 'comido') continue;
    const pF = posicionVisual(f);
    const dist = Math.hypot(pF.x - pPac.x, pF.y - pPac.y);
    if (dist >= RADIO_COLISION) continue;

    if (f.estado === 'asustado') {
      f.estado = 'comido';
      estado.combo += 1;
      estado.puntaje += Math.min(1600, 200 * 2 ** (estado.combo - 1));
    } else {
      perderVida(estado);
      return; // una sola colisión por cuadro: no perder 2+ vidas si hay fantasmas superpuestos
    }
  }
}

/** IA de fantasmas — ver `fantasmas.ts`. Inyectada como parámetro (no
 * importada acá arriba) para que `motor.ts` no dependa de la implementación
 * concreta de pathfinding, sólo de su firma. */
export type CalculadoraDireccion = (f: FantasmaEstado, estado: EstadoJuego) => Direccion | null;

function avanzarFantasma(f: FantasmaEstado, estado: EstadoJuego, dt: number, calcularDireccion: CalculadoraDireccion): void {
  if (f.estado === 'comido') {
    // Chequeo por TILE, no por `progreso === 0`: después de cruzar un tile,
    // `progreso` casi nunca vuelve a quedar en exactamente 0 (le queda el
    // resto del `dt` de ese cuadro) — gatillar acá con esa igualdad casi
    // nunca se cumplía (bug real, encontrado con `scripts/tmp_sim_pacman2`:
    // un fantasma comido se quedaba dando vueltas para siempre sin nunca
    // "llegar" oficialmente a la casa).
    if (f.tileX === estado.casaFantasmas.x && f.tileY === estado.casaFantasmas.y) {
      f.estado = 'normal';
      return;
    }
    avanzarEntidad(f, () => calcularDireccion(f, estado), estado.paredes, estado.ancho, VEL_FANTASMA_COMIDO, dt);
    return;
  }

  // Misma razón que arriba: la IA se recalcula CADA cuadro (no sólo "al
  // llegar a una intersección") — `avanzarEntidad` de todos modos sólo
  // ADOPTA una dirección nueva en el centro de un tile (o al revertir), así
  // que recalcular de más acá es inofensivo, sólo redundante; cachear "una
  // vez por tile" con el mismo gate de `progreso === 0` tenía el mismo bug
  // que arriba: casi nunca se recalculaba después del primer cuadro, y los
  // 3 fantasmas quedaban prácticamente clavados en su primera decisión.
  const vel = f.estado === 'asustado' ? VEL_FANTASMA_ASUSTADO : VEL_FANTASMA_NORMAL;
  avanzarEntidad(f, () => calcularDireccion(f, estado), estado.paredes, estado.ancho, vel, dt);
}

/**
 * Un cuadro de juego. `dt` en segundos, ya lo clampea acá (guard ante un
 * frame larguísimo por lag: sin esto una app puesta en background y vuelta
 * podría hacer que todo el mundo "teletransporte" varios tiles de una).
 */
export function actualizar(estado: EstadoJuego, dtCrudo: number, calcularDireccionFantasma: CalculadoraDireccion): void {
  if (estado.terminado) return;
  const dt = Math.min(dtCrudo, 0.05);
  estado.duracionSegundos += dt;

  if (estado.pausaRespawn > 0) {
    estado.pausaRespawn = Math.max(0, estado.pausaRespawn - dt);
    return;
  }

  if (estado.asustadoRestante > 0) {
    estado.asustadoRestante = Math.max(0, estado.asustadoRestante - dt);
    if (estado.asustadoRestante === 0) {
      estado.combo = 0;
      for (const f of estado.fantasmas) if (f.estado === 'asustado') f.estado = 'normal';
    }
  }

  avanzarEntidad(estado.pacman, () => estado.pacman.dirDeseada, estado.paredes, estado.ancho, VEL_PACMAN, dt);

  const k = clave(estado.pacman.tileX, estado.pacman.tileY);
  if (estado.puntos.has(k)) {
    estado.puntos.delete(k);
    estado.puntaje += PUNTOS_DOT;
  } else if (estado.pellets.has(k)) {
    estado.pellets.delete(k);
    estado.puntaje += PUNTOS_PELLET;
    estado.asustadoRestante = SEGUNDOS_ASUSTADO;
    estado.combo = 0;
    for (const f of estado.fantasmas) if (f.estado !== 'comido') f.estado = 'asustado';
  }

  for (const f of estado.fantasmas) avanzarFantasma(f, estado, dt, calcularDireccionFantasma);

  detectarColisiones(estado);

  if (!estado.terminado && estado.puntos.size === 0 && estado.pellets.size === 0) {
    estado.terminado = true;
    estado.gano = true;
  }
}

/** A qué tile apunta cada perfil de fantasma — usado por `fantasmas.ts`
 * (acá vive porque necesita `TILES_EMBOSCADA`/`DISTANCIA_PATRULLA`, internos
 * de este módulo, y `DIRS`). */
export function objetivoDe(perfil: PerfilFantasma, fantasma: { x: number; y: number }, estado: EstadoJuego): { x: number; y: number } {
  const pac = estado.pacman;
  if (perfil === 'perseguidor') return { x: pac.tileX, y: pac.tileY };

  if (perfil === 'emboscador') {
    const d = pac.dir ? DIRS[pac.dir] : { dx: 0, dy: 0 };
    return {
      x: Math.max(0, Math.min(estado.ancho - 1, pac.tileX + d.dx * TILES_EMBOSCADA)),
      y: Math.max(0, Math.min(estado.alto - 1, pac.tileY + d.dy * TILES_EMBOSCADA)),
    };
  }

  // 'patrulla': persigue si está lejos, si no se va a su esquina fija — el
  // vaivén clásico de Clyde (nunca se queda pegado a Pac-Man).
  const dist = Math.hypot(fantasma.x - pac.tileX, fantasma.y - pac.tileY);
  return dist > DISTANCIA_PATRULLA ? { x: pac.tileX, y: pac.tileY } : estado.esquinaPatrulla;
}
