/**
 * Laberintos de HuePacMan.
 *
 * Un laberinto es un `string[]` (una fila por string, todas del mismo largo):
 *   `#` pared · `.` punto · `o` power-pellet · ` ` camino sin punto (túnel,
 *   puerta y "foso" alrededor de la casa) · `G` interior de la casa de
 *   fantasmas (camino, sin punto, y además marca de dónde salen/reaparecen) ·
 *   `P` spawn de Pac-Man.
 *
 * Hay 3 fijos (el clásico de arcade y dos variantes) y uno ALEATORIO que se
 * genera solo en cada partida (recursive-backtracker espejado + foso + casa +
 * verificación de que todo tile transitable se alcanza desde el spawn). El
 * reto es que el aleatorio nunca sale igual dos veces.
 */

export type LaberintoId = 'clasico' | 'aleatorio';

export type LaberintoOpcion = {
  id: LaberintoId;
  nombre: string;
  /** El aleatorio no tiene layout fijo; se arma con `generarLaberinto()`. */
  fijo?: string[];
};

/** Clásico de arcade, 28x31. Validado: todo tile transitable se alcanza desde el spawn. */
const CLASICO: string[] = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '######.##### ## #####.######',
  '######.##          ##.######',
  '######.## ###  ### ##.######',
  '######.## #GGGGGG# ##.######',
  '     ..   #GGGGGG#   ..     ',
  '######.## #GGGGGG# ##.######',
  '######.## ######## ##.######',
  '######.##          ##.######',
  '######.## ######## ##.######',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......P .......##..o#',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '#..........................#',
  '############################',
];

export const LABERINTOS: LaberintoOpcion[] = [
  { id: 'clasico', nombre: 'Clásico', fijo: CLASICO },
  { id: 'aleatorio', nombre: 'Aleatorio', fijo: undefined },
];

// ---------------------------------------------------------------------------
// Generador aleatorio
// ---------------------------------------------------------------------------

/** PRNG chico y determinístico (mulberry32) — mismo criterio que el resto de
 * HuePlay (ver `huematch/motor.ts`): dado un `seed`, siempre la misma secuencia. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELDAS_COLS = 5; // mitad izquierda; se espeja -> ancho total = 2*(2*C+1)-1 = 21
const CELDAS_ROWS = 13; // alto total = 2*R+1 = 27

/**
 * Arma un laberinto nuevo. Recursive-backtracker sobre la mitad izquierda +
 * unos ciclos extra (para que los fantasmas no puedan acorralar sin salida) +
 * espejado + túnel lateral + casa de fantasmas al centro + power-pellets en
 * las 4 esquinas. Si por mala suerte la verificación de conectividad falla
 * (no debería), reintenta con otra semilla; en última instancia devuelve el
 * clásico.
 */
export function generarLaberinto(seed = Math.floor(Math.random() * 2 ** 31)): string[] {
  for (let intento = 0; intento < 8; intento++) {
    const m = intentarGenerar((seed + intento * 977) >>> 0);
    if (m) return m;
  }
  return CLASICO;
}

function intentarGenerar(seed: number): string[] | null {
  const rnd = prng(seed);
  const HALF_W = CELDAS_COLS * 2 + 1;
  const TILE_H = CELDAS_ROWS * 2 + 1;
  const TOTAL_W = HALF_W * 2 - 1;

  const visitado: boolean[][] = Array.from({ length: CELDAS_ROWS }, () => new Array(CELDAS_COLS).fill(false));
  const half: string[][] = Array.from({ length: TILE_H }, () => new Array(HALF_W).fill('#'));

  const pila: [number, number][] = [[0, 0]];
  visitado[0]![0] = true;
  half[1]![1] = '.';
  while (pila.length) {
    const [cx, cy] = pila[pila.length - 1]!;
    const dirs: [number, number][] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j]!, dirs[i]!];
    }
    let avanzo = false;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= CELDAS_COLS || ny < 0 || ny >= CELDAS_ROWS || visitado[ny]![nx]) continue;
      const tx = cx * 2 + 1;
      const ty = cy * 2 + 1;
      half[ty + dy]![tx + dx] = '.';
      half[ny * 2 + 1]![nx * 2 + 1] = '.';
      visitado[ny]![nx] = true;
      pila.push([nx, ny]);
      avanzo = true;
      break;
    }
    if (!avanzo) pila.pop();
  }

  // Ciclos extra: tirar abajo algunas paredes internas entre dos celdas ya
  // talladas (laberinto "no árbol", más jugable).
  let ciclos = 7;
  let tries = 0;
  while (ciclos > 0 && tries < 400) {
    tries++;
    const ty = 1 + Math.floor(rnd() * (TILE_H - 2));
    const tx = 1 + Math.floor(rnd() * (HALF_W - 2));
    if (half[ty]![tx] !== '#') continue;
    const h = half[ty]![tx - 1] === '.' && half[ty]![tx + 1] === '.' && half[ty - 1]![tx] === '#' && half[ty + 1]![tx] === '#';
    const v = half[ty - 1]![tx] === '.' && half[ty + 1]![tx] === '.' && half[ty]![tx - 1] === '#' && half[ty]![tx + 1] === '#';
    if (h || v) {
      half[ty]![tx] = '.';
      ciclos--;
    }
  }

  // Espejar.
  const grid: string[][] = Array.from({ length: TILE_H }, () => new Array(TOTAL_W).fill('#'));
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < HALF_W; x++) {
      grid[y]![x] = half[y]![x]!;
      grid[y]![TOTAL_W - 1 - x] = half[y]![x]!;
    }
  }

  // Borde exterior sólido.
  for (let x = 0; x < TOTAL_W; x++) {
    grid[0]![x] = '#';
    grid[TILE_H - 1]![x] = '#';
  }
  for (let y = 0; y < TILE_H; y++) {
    grid[y]![0] = '#';
    grid[y]![TOTAL_W - 1] = '#';
  }

  // Túnel lateral en una fila cercana al medio.
  const filaTunel = TILE_H % 2 === 0 ? TILE_H / 2 - 1 : (TILE_H - 1) / 2;
  grid[filaTunel]![0] = ' ';
  grid[filaTunel]![TOTAL_W - 1] = ' ';
  grid[filaTunel]![1] = '.';
  grid[filaTunel]![TOTAL_W - 2] = '.';

  // Casa de fantasmas: cuarto de 5x3 al centro, con puerta arriba (2 tiles).
  const cy0 = Math.floor(TILE_H / 2) - 1;
  const cx0 = Math.floor(TOTAL_W / 2) - 2;
  for (let y = cy0; y < cy0 + 3; y++) {
    for (let x = cx0; x < cx0 + 5; x++) grid[y]![x] = 'G';
  }
  for (let x = cx0 - 1; x < cx0 + 6; x++) {
    grid[cy0 - 1]![x] = '#';
    grid[cy0 + 3]![x] = '#';
  }
  for (let y = cy0 - 1; y < cy0 + 4; y++) {
    grid[y]![cx0 - 1] = '#';
    grid[y]![cx0 + 5] = '#';
  }
  const puerta = Math.floor(TOTAL_W / 2);
  grid[cy0 - 1]![puerta] = ' ';
  grid[cy0 - 1]![puerta - 1] = ' ';
  // Un tile de "aire" arriba de la puerta para que sí o sí conecte al foso.
  grid[cy0 - 2]![puerta] = grid[cy0 - 2]![puerta] === '#' ? '.' : grid[cy0 - 2]![puerta]!;
  grid[cy0 - 2]![puerta - 1] = grid[cy0 - 2]![puerta - 1] === '#' ? '.' : grid[cy0 - 2]![puerta - 1]!;

  // Spawn de Pac-Man: primer camino hacia abajo desde el centro.
  let spawnY = cy0 + 5;
  let spawnX = Math.floor(TOTAL_W / 2);
  outer: for (let y = spawnY; y < TILE_H - 1; y++) {
    for (let dx = 0; dx < TOTAL_W; dx++) {
      for (const sx of [spawnX - dx, spawnX + dx]) {
        if (sx > 0 && sx < TOTAL_W - 1 && grid[y]![sx] === '.') {
          spawnX = sx;
          spawnY = y;
          break outer;
        }
      }
    }
  }
  grid[spawnY]![spawnX] = 'P';

  // Power-pellets: camino '.' más cercano a cada esquina.
  const esquinas: [number, number][] = [
    [2, 2],
    [TOTAL_W - 3, 2],
    [2, TILE_H - 3],
    [TOTAL_W - 3, TILE_H - 3],
  ];
  for (const [ex, ey] of esquinas) {
    let mejor: [number, number] | null = null;
    let mejorD = Infinity;
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TOTAL_W; x++) {
        if (grid[y]![x] !== '.') continue;
        const d = (x - ex) ** 2 + (y - ey) ** 2;
        if (d < mejorD) {
          mejorD = d;
          mejor = [x, y];
        }
      }
    }
    if (mejor) grid[mejor[1]]![mejor[0]] = 'o';
  }

  const filas = grid.map((r) => r.join(''));

  // Verificar: BFS desde el spawn debe alcanzar TODO tile no-pared.
  if (!todoConectado(filas, spawnX, spawnY)) return null;
  return filas;
}

function todoConectado(filas: string[], sx: number, sy: number): boolean {
  const H = filas.length;
  const W = filas[0]!.length;
  const seen = new Set<string>([`${sx},${sy}`]);
  const cola: [number, number][] = [[sx, sy]];
  let alcanzados = 0;
  while (cola.length) {
    const [x, y] = cola.shift()!;
    alcanzados++;
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as [number, number][]) {
      let nx = x + dx;
      const ny = y + dy;
      if (nx < 0) nx = W - 1;
      else if (nx >= W) nx = 0;
      if (ny < 0 || ny >= H) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k) || filas[ny]![nx] === '#') continue;
      seen.add(k);
      cola.push([nx, ny]);
    }
  }
  let transitables = 0;
  for (const r of filas) for (const c of r) if (c !== '#') transitables++;
  return alcanzados === transitables;
}

/** Devuelve el layout de un id. Para 'aleatorio' arma uno nuevo cada vez. */
export function obtenerLaberinto(id: LaberintoId): string[] {
  if (id === 'aleatorio') return generarLaberinto();
  const op = LABERINTOS.find((l) => l.id === id);
  return op?.fijo ?? CLASICO;
}

export const LABERINTO_CLASICO = CLASICO;
