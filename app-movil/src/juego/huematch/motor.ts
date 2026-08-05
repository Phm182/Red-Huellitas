/**
 * Motor de HueMatch. Lógica pura, sin React ni dibujo.
 *
 * Está separado de la pantalla para poder razonarlo (y probarlo) sin montar
 * nada: un tablero es una matriz de números y todas las funciones de acá son
 * de entrada/salida, sin estado escondido.
 */

/** Las 6 fichas. El índice es lo que se guarda en el tablero. */
export const FICHAS = ['huella', 'hueso', 'pelota', 'pez', 'corazon', 'estrella'] as const;
export type Ficha = number;

export const FILAS = 7;
export const COLUMNAS = 7;
export const VACIO = -1;

export type Tablero = Ficha[][];
export type Celda = { fila: number; col: number };

/**
 * PRNG determinístico (mulberry32).
 *
 * `Math.random()` no sirve acá: en un duelo los dos jugadores tienen que
 * recibir exactamente el mismo tablero, y eso sólo se logra si las fichas
 * salen de una semilla compartida.
 */
export function prng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ficha que le toca a la columna `col` en su `indice`-ésima reposición.
 *
 * Cada columna tiene su propia cola infinita derivada de la semilla, en vez de
 * un único stream global consumido en orden de llamada. La diferencia importa
 * en un duelo: con un stream global, apenas los dos jugadores hacen jugadas
 * distintas las fichas que bajan se desincronizan y el tablero deja de ser el
 * mismo. Así, la columna 3 siempre entrega la misma secuencia para los dos, y
 * lo único que los diferencia es qué tan bien juegan.
 */
function fichaDeCola(semilla: number, col: number, indice: number): Ficha {
  // Se mezcla semilla+columna+índice en un entero y se usa de semilla puntual.
  let h = (semilla ^ Math.imul(col + 1, 0x9e3779b1) ^ Math.imul(indice + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x2545f491) >>> 0;
  return (h >>> 8) % FICHAS.length;
}

/** Estado mutable de las colas de reposición, uno por columna. */
export type Colas = number[];

export function colasNuevas(): Colas {
  return new Array(COLUMNAS).fill(0);
}

/** Busca todos los grupos de 3 o más en línea (horizontal y vertical). */
export function buscarMatches(t: Tablero): Celda[] {
  const marcadas = new Set<string>();

  for (let f = 0; f < FILAS; f++) {
    let inicio = 0;
    for (let c = 1; c <= COLUMNAS; c++) {
      const igual = c < COLUMNAS && t[f]![c] === t[f]![inicio] && t[f]![inicio] !== VACIO;
      if (!igual) {
        if (c - inicio >= 3) {
          for (let k = inicio; k < c; k++) marcadas.add(`${f},${k}`);
        }
        inicio = c;
      }
    }
  }

  for (let c = 0; c < COLUMNAS; c++) {
    let inicio = 0;
    for (let f = 1; f <= FILAS; f++) {
      const igual = f < FILAS && t[f]![c] === t[inicio]![c] && t[inicio]![c] !== VACIO;
      if (!igual) {
        if (f - inicio >= 3) {
          for (let k = inicio; k < f; k++) marcadas.add(`${k},${c}`);
        }
        inicio = f;
      }
    }
  }

  return [...marcadas].map((s) => {
    const [fila, col] = s.split(',').map(Number);
    return { fila: fila!, col: col! };
  });
}

/** Aplica gravedad y rellena desde arriba con las colas de cada columna. */
export function caerYRellenar(t: Tablero, semilla: number, colas: Colas): Tablero {
  const nuevo = t.map((f) => [...f]);

  for (let c = 0; c < COLUMNAS; c++) {
    // Se compacta hacia abajo lo que quedó vivo.
    const vivos: Ficha[] = [];
    for (let f = FILAS - 1; f >= 0; f--) {
      if (nuevo[f]![c] !== VACIO) vivos.push(nuevo[f]![c]!);
    }
    for (let f = FILAS - 1, i = 0; f >= 0; f--, i++) {
      if (i < vivos.length) {
        nuevo[f]![c] = vivos[i]!;
      } else {
        nuevo[f]![c] = fichaDeCola(semilla, c, colas[c]!);
        colas[c]!++;
      }
    }
  }

  return nuevo;
}

function quitar(t: Tablero, celdas: Celda[]): Tablero {
  const nuevo = t.map((f) => [...f]);
  for (const { fila, col } of celdas) nuevo[fila]![col] = VACIO;
  return nuevo;
}

/** ¿Hay al menos una jugada que arme un match? */
export function hayJugada(t: Tablero): boolean {
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      for (const [df, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const f2 = f + df;
        const c2 = c + dc;
        if (f2 >= FILAS || c2 >= COLUMNAS) continue;
        const prueba = t.map((x) => [...x]);
        const tmp = prueba[f]![c]!;
        prueba[f]![c] = prueba[f2]![c2]!;
        prueba[f2]![c2] = tmp;
        if (buscarMatches(prueba).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Tablero inicial: sin matches ya armados y con al menos una jugada posible.
 *
 * Arrancar con matches hechos regalaría puntos sin jugar, y arrancar sin
 * jugadas posibles dejaría al jugador mirando la pantalla hasta que se acabe
 * el tiempo. Se reintenta con la semilla corrida, no con una semilla al azar,
 * para que el resultado siga siendo el mismo para los dos jugadores del duelo.
 */
export function tableroInicial(semilla: number): { tablero: Tablero; colas: Colas } {
  for (let intento = 0; intento < 40; intento++) {
    const s = (semilla + intento * 7919) >>> 0;
    const colas = colasNuevas();
    let t: Tablero = [];
    for (let f = 0; f < FILAS; f++) {
      const fila: Ficha[] = [];
      for (let c = 0; c < COLUMNAS; c++) {
        fila.push(fichaDeCola(s, c, colas[c]!));
        colas[c]!++;
      }
      t.push(fila);
    }

    // Se limpian los matches iniciales cambiando la ficha por otra que no arme
    // línea, en vez de rellenar de nuevo: rellenar puede volver a armar match y
    // entrar en un ciclo largo.
    for (let vuelta = 0; vuelta < 12; vuelta++) {
      const m = buscarMatches(t);
      if (m.length === 0) break;
      for (const { fila, col } of m) {
        for (let alt = 0; alt < FICHAS.length; alt++) {
          if (alt === t[fila]![col]) continue;
          const prueba = t.map((x) => [...x]);
          prueba[fila]![col] = alt;
          if (buscarMatches(prueba).length < m.length) {
            t = prueba;
            break;
          }
        }
      }
    }

    if (buscarMatches(t).length === 0 && hayJugada(t)) {
      return { tablero: t, colas };
    }
  }

  // Salida de emergencia: nunca debería llegar acá, pero es preferible un
  // tablero imperfecto a un cuelgue.
  const colas = colasNuevas();
  const t: Tablero = [];
  for (let f = 0; f < FILAS; f++) {
    const fila: Ficha[] = [];
    for (let c = 0; c < COLUMNAS; c++) fila.push((f + c) % FICHAS.length);
    t.push(fila);
  }
  return { tablero: t, colas };
}

export function sonVecinas(a: Celda, b: Celda): boolean {
  return Math.abs(a.fila - b.fila) + Math.abs(a.col - b.col) === 1;
}

export type PasoCascada = {
  /** Tablero con las celdas del match ya marcadas en VACIO, para animar. */
  explotando: Tablero;
  celdas: Celda[];
  /** Tablero después de caer y rellenar. */
  resultado: Tablero;
  puntos: number;
  /** 1 para el match del jugador, 2+ para lo que se arma solo después. */
  cascada: number;
};

/**
 * Resuelve un intercambio completo: el match, las caídas y las cascadas.
 *
 * Devuelve la lista de pasos para que la pantalla los anime uno por uno; si
 * devolviera sólo el tablero final, las cascadas —que son la parte más
 * satisfactoria del juego— no se verían nunca.
 */
export function resolverIntercambio(
  t: Tablero,
  a: Celda,
  b: Celda,
  semilla: number,
  colas: Colas
): { valido: boolean; pasos: PasoCascada[]; tablero: Tablero; puntos: number } {
  if (!sonVecinas(a, b)) {
    return { valido: false, pasos: [], tablero: t, puntos: 0 };
  }

  let actual = t.map((f) => [...f]);
  const tmp = actual[a.fila]![a.col]!;
  actual[a.fila]![a.col] = actual[b.fila]![b.col]!;
  actual[b.fila]![b.col] = tmp;

  if (buscarMatches(actual).length === 0) {
    return { valido: false, pasos: [], tablero: t, puntos: 0 };
  }

  const pasos: PasoCascada[] = [];
  let total = 0;
  let cascada = 1;

  while (true) {
    const celdas = buscarMatches(actual);
    if (celdas.length === 0) break;

    // 10 por ficha, multiplicado por la cascada. Encadenar es lo que separa una
    // partida buena de una normal, así que la cadena tiene que pagar bastante
    // más que dos matches sueltos.
    const puntos = celdas.length * 10 * cascada;
    total += puntos;

    const explotando = quitar(actual, celdas);
    const resultado = caerYRellenar(explotando, semilla, colas);

    pasos.push({ explotando, celdas, resultado, puntos, cascada });
    actual = resultado;
    cascada++;
  }

  return { valido: true, pasos, tablero: actual, puntos: total };
}

/**
 * Mezcla el tablero cuando no quedan jugadas.
 *
 * Sigue la cola de cada columna, así que el tablero mezclado también es el
 * mismo para los dos jugadores de un duelo.
 */
export function mezclar(semilla: number, colas: Colas): Tablero {
  let t: Tablero = [];
  for (let f = 0; f < FILAS; f++) {
    const fila: Ficha[] = [];
    for (let c = 0; c < COLUMNAS; c++) {
      fila.push(fichaDeCola(semilla, c, colas[c]!));
      colas[c]!++;
    }
    t.push(fila);
  }
  let guarda = 0;
  while ((buscarMatches(t).length > 0 || !hayJugada(t)) && guarda < 20) {
    t = t.map((fila, f) =>
      fila.map((_, c) => {
        const v = fichaDeCola(semilla, c, colas[c]!);
        colas[c]!++;
        return v;
      })
    );
    guarda++;
  }
  return t;
}
