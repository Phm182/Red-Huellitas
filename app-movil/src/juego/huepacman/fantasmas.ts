/**
 * IA de los 3 fantasmas de HuePacMan. Aparte de `motor.ts` (que sólo conoce
 * la firma `CalculadoraDireccion`, no esta implementación) para que el motor
 * no dependa del algoritmo de pathfinding concreto.
 *
 * BFS sobre la grilla (no A*: 17x21=357 tiles, sin pesos, A* no aporta nada
 * acá) — se llama sólo cuando un fantasma llega de lleno a un tile nuevo
 * (`motor.ts::avanzarFantasma` ya se encarga de eso), nunca por cuadro.
 */

import {
  Direccion,
  DIRS,
  EstadoJuego,
  FantasmaEstado,
  OPUESTA,
  esCaminoValido,
  objetivoDe,
} from './motor';

const DIRECCIONES: Direccion[] = ['arriba', 'abajo', 'izquierda', 'derecha'];

type Nodo = { x: number; y: number };

function vecinosValidos(paredes: boolean[][], ancho: number, alto: number, x: number, y: number): { dir: Direccion; x: number; y: number }[] {
  const out: { dir: Direccion; x: number; y: number }[] = [];
  for (const dir of DIRECCIONES) {
    const d = DIRS[dir];
    let nx = x + d.dx;
    const ny = y + d.dy;
    if (nx < 0) nx = ancho - 1;
    else if (nx >= ancho) nx = 0;
    if (ny < 0 || ny >= alto) continue;
    if (esCaminoValido(paredes, ancho, nx, ny)) out.push({ dir, x: nx, y: ny });
  }
  return out;
}

/**
 * BFS desde `desde` hasta `hasta`: devuelve la dirección del PRIMER paso del
 * camino más corto. `dirActual` (si viene) se usa para prohibir la reversa
 * como primer paso — regla clásica de fantasma de arcade: nunca da media
 * vuelta por decisión propia, salvo que sea la única salida (callejón sin
 * salida), caso en el que se reintenta sin la prohibición.
 */
function bfsPrimerPaso(
  paredes: boolean[][],
  ancho: number,
  alto: number,
  desde: Nodo,
  hasta: Nodo,
  dirActual: Direccion | null
): Direccion | null {
  if (desde.x === hasta.x && desde.y === hasta.y) return null;

  const prohibida = dirActual ? OPUESTA[dirActual] : null;
  const visitado = new Set<string>([`${desde.x},${desde.y}`]);
  // Por cada tile visitado, qué dirección de PRIMER paso (desde `desde`)
  // llevó hasta ahí — así al encontrar el destino no hace falta reconstruir
  // todo el camino, alcanza con leer este valor.
  const primerPasoDe = new Map<string, Direccion>();

  let frontera: Nodo[] = [desde];
  let esPrimerNivel = true;

  while (frontera.length > 0) {
    const siguiente: Nodo[] = [];
    for (const p of frontera) {
      const pDir = esPrimerNivel ? null : primerPasoDe.get(`${p.x},${p.y}`)!;
      for (const v of vecinosValidos(paredes, ancho, alto, p.x, p.y)) {
        if (esPrimerNivel && prohibida && v.dir === prohibida) continue;
        const k = `${v.x},${v.y}`;
        if (visitado.has(k)) continue;
        visitado.add(k);
        const dirDesdeInicio = esPrimerNivel ? v.dir : pDir!;
        if (v.x === hasta.x && v.y === hasta.y) return dirDesdeInicio;
        primerPasoDe.set(k, dirDesdeInicio);
        siguiente.push({ x: v.x, y: v.y });
      }
    }
    frontera = siguiente;
    esPrimerNivel = false;
  }

  // Sin la reversa no se llegó a ningún lado (o el destino es inalcanzable
  // desde acá sin darse vuelta) — único caso en que se permite.
  if (prohibida) return bfsPrimerPaso(paredes, ancho, alto, desde, hasta, null);
  return null;
}

/** Modo asustado: sin objetivo, sólo huir al azar — cualquier vecino válido
 * sirve, evitando la reversa salvo que sea la única salida (mismo criterio
 * que perseguir, para que no tiemble pegado yendo y viniendo 1 tile). */
function direccionAlAzar(paredes: boolean[][], ancho: number, alto: number, x: number, y: number, dirActual: Direccion | null): Direccion | null {
  const vecinos = vecinosValidos(paredes, ancho, alto, x, y);
  if (vecinos.length === 0) return null;
  const prohibida = dirActual ? OPUESTA[dirActual] : null;
  const sinReversa = prohibida ? vecinos.filter((v) => v.dir !== prohibida) : vecinos;
  const candidatos = sinReversa.length > 0 ? sinReversa : vecinos;
  return candidatos[Math.floor(Math.random() * candidatos.length)]!.dir;
}

/** La `CalculadoraDireccion` que `motor.ts::actualizar` recibe como
 * parámetro — decide la próxima dirección de UN fantasma, según su perfil y
 * estado actual (normal = persigue/patrulla según su perfil, asustado =
 * huye al azar; 'comido' lo maneja `motor.ts` directo con esta misma
 * función pero apuntando a la casa, ver `avanzarFantasma`). */
export function calcularDireccionFantasma(f: FantasmaEstado, estado: EstadoJuego): Direccion | null {
  if (f.estado === 'comido') {
    return bfsPrimerPaso(estado.paredes, estado.ancho, estado.alto, { x: f.tileX, y: f.tileY }, estado.casaFantasmas, f.dir);
  }
  if (f.estado === 'asustado') {
    return direccionAlAzar(estado.paredes, estado.ancho, estado.alto, f.tileX, f.tileY, f.dir);
  }
  const objetivo = objetivoDe(f.id, { x: f.tileX, y: f.tileY }, estado);
  return bfsPrimerPaso(estado.paredes, estado.ancho, estado.alto, { x: f.tileX, y: f.tileY }, objetivo, f.dir);
}
