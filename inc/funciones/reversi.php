<?php
/**
 * HueReversi (Othello) — 1 contra 1, tablero 8x8. Mismo esquema que
 * inc/funciones/damas.php: string de 64 caracteres, todo server-authoritative,
 * sin "motor" en el cliente.
 */

const RH_REVERSI_FILAS = 8;
const RH_REVERSI_COLS = 8;

/**
 * Tablero inicial: las 4 fichas del centro en diagonal.
 * Índice = fila*8+col. '1' = retador, '2' = retado, '0' = vacío.
 */
function rh_reversi_inicial(): string
{
    $tablero = str_repeat('0', RH_REVERSI_FILAS * RH_REVERSI_COLS);
    $tablero[3 * 8 + 3] = '1';
    $tablero[4 * 8 + 4] = '1';
    $tablero[3 * 8 + 4] = '2';
    $tablero[4 * 8 + 3] = '2';
    return $tablero;
}

const RH_REVERSI_DIRECCIONES = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
];

function rh_reversi_en_rango(int $fila, int $col): bool
{
    return $fila >= 0 && $fila < RH_REVERSI_FILAS && $col >= 0 && $col < RH_REVERSI_COLS;
}

/**
 * Fichas que se voltearían si `$lado` juega en (fila,col), en UNA dirección.
 * Devuelve la lista de [fila,col] volteadas en esa dirección, o [] si no hay
 * flanqueo válido (no hay una línea contigua de fichas rivales terminada en
 * una ficha propia).
 */
function rh_reversi_volteadas_en_direccion(string $tablero, int $fila, int $col, int $dFila, int $dCol, int $lado): array
{
    $rival = $lado === 1 ? '2' : '1';
    $propio = (string) $lado;
    $volteadas = [];
    $f = $fila + $dFila;
    $c = $col + $dCol;

    while (rh_reversi_en_rango($f, $c) && $tablero[$f * 8 + $c] === $rival) {
        $volteadas[] = [$f, $c];
        $f += $dFila;
        $c += $dCol;
    }

    if ($volteadas && rh_reversi_en_rango($f, $c) && $tablero[$f * 8 + $c] === $propio) {
        return $volteadas;
    }
    return [];
}

/**
 * Todos los movimientos legales para `$lado`.
 *
 * @return list<array{fila:int, col:int, volteadas: list<array{0:int,1:int}>}>
 */
function rh_reversi_movimientos_legales(string $tablero, int $lado): array
{
    $legales = [];
    for ($fila = 0; $fila < RH_REVERSI_FILAS; $fila++) {
        for ($col = 0; $col < RH_REVERSI_COLS; $col++) {
            if ($tablero[$fila * 8 + $col] !== '0') {
                continue;
            }
            $volteadas = [];
            foreach (RH_REVERSI_DIRECCIONES as [$dFila, $dCol]) {
                $enEstaDireccion = rh_reversi_volteadas_en_direccion($tablero, $fila, $col, $dFila, $dCol, $lado);
                if ($enEstaDireccion) {
                    array_push($volteadas, ...$enEstaDireccion);
                }
            }
            if ($volteadas) {
                $legales[] = ['fila' => $fila, 'col' => $col, 'volteadas' => $volteadas];
            }
        }
    }
    return $legales;
}

/** Coloca la ficha de `$movimiento` y voltea todo lo indicado. */
function rh_reversi_aplicar(string $tablero, array $movimiento, int $lado): string
{
    $tablero[$movimiento['fila'] * 8 + $movimiento['col']] = (string) $lado;
    foreach ($movimiento['volteadas'] as [$f, $c]) {
        $tablero[$f * 8 + $c] = (string) $lado;
    }
    return $tablero;
}

/** Sin movimientos legales para `$lado`. */
function rh_reversi_sin_movimientos(string $tablero, int $lado): bool
{
    return rh_reversi_movimientos_legales($tablero, $lado) === [];
}

/** Cuenta fichas por lado — para desempatar el ganador al terminar. */
function rh_reversi_contar(string $tablero): array
{
    $conteo = [1 => 0, 2 => 0];
    for ($i = 0, $len = strlen($tablero); $i < $len; $i++) {
        if ($tablero[$i] === '1') {
            $conteo[1]++;
        } elseif ($tablero[$i] === '2') {
            $conteo[2]++;
        }
    }
    return $conteo;
}

// ------------------------------------------------------------------
// IA: negamax con poda alfa-beta, mismo molde que rh_damas_minimax().
// ------------------------------------------------------------------

const RH_REVERSI_IA_PROFUNDIDAD = 4;

/** Esquinas — lo más valioso del tablero, nunca se pueden recuperar una vez perdidas. */
const RH_REVERSI_ESQUINAS = [[0, 0], [0, 7], [7, 0], [7, 7]];

/** Casillas pegadas a una esquina — peligrosas si esa esquina sigue vacía. */
const RH_REVERSI_ADYACENTES_ESQUINA = [
    [0, 1], [1, 0], [1, 1],
    [0, 6], [1, 7], [1, 6],
    [6, 0], [7, 1], [6, 1],
    [6, 7], [7, 6], [6, 6],
];

function rh_reversi_heuristica(string $tablero, int $lado): float
{
    $rival = $lado === 1 ? 2 : 1;
    $conteo = rh_reversi_contar($tablero);
    $puntaje = ($conteo[$lado] - $conteo[$rival]) * 1.0;

    foreach (RH_REVERSI_ESQUINAS as [$f, $c]) {
        $valor = $tablero[$f * 8 + $c];
        if ($valor === (string) $lado) {
            $puntaje += 25;
        } elseif ($valor === (string) $rival) {
            $puntaje -= 25;
        }
    }

    foreach (RH_REVERSI_ADYACENTES_ESQUINA as [$f, $c]) {
        // Sólo penaliza si la esquina correspondiente sigue vacía — una vez
        // ocupada, la casilla adyacente deja de ser peligrosa.
        $valor = $tablero[$f * 8 + $c];
        if ($valor === (string) $lado) {
            $puntaje -= 4;
        } elseif ($valor === (string) $rival) {
            $puntaje += 4;
        }
    }

    $misMovs = count(rh_reversi_movimientos_legales($tablero, $lado));
    $susMovs = count(rh_reversi_movimientos_legales($tablero, $rival));
    $puntaje += ($misMovs - $susMovs) * 2;

    return $puntaje;
}

function rh_reversi_minimax(string $tablero, int $lado, int $profundidad, float $alfa, float $beta): float
{
    if ($profundidad <= 0) {
        return rh_reversi_heuristica($tablero, $lado);
    }

    $rival = $lado === 1 ? 2 : 1;
    $movimientos = rh_reversi_movimientos_legales($tablero, $lado);

    if (!$movimientos) {
        // Sin movimiento: si el rival tampoco tiene, el juego terminó acá.
        if (rh_reversi_sin_movimientos($tablero, $rival)) {
            $conteo = rh_reversi_contar($tablero);
            $diferencia = $conteo[$lado] - $conteo[$rival];
            return $diferencia > 0 ? 10000.0 : ($diferencia < 0 ? -10000.0 : 0.0);
        }
        // Se pasa el turno sin cambiar de lado en la heurística (mismo signo).
        return -rh_reversi_minimax($tablero, $rival, $profundidad - 1, -$beta, -$alfa);
    }

    $mejor = -PHP_FLOAT_MAX;
    foreach ($movimientos as $mov) {
        $siguiente = rh_reversi_aplicar($tablero, $mov, $lado);
        $valor = -rh_reversi_minimax($siguiente, $rival, $profundidad - 1, -$beta, -$alfa);
        if ($valor > $mejor) {
            $mejor = $valor;
        }
        if ($mejor > $alfa) {
            $alfa = $mejor;
        }
        if ($alfa >= $beta) {
            break;
        }
    }
    return $mejor;
}

/** @return array{fila:int,col:int,volteadas:list<array{0:int,1:int}>}|null */
function rh_reversi_ia_elegir(string $tablero, int $lado, int $profundidad = RH_REVERSI_IA_PROFUNDIDAD): ?array
{
    $movimientos = rh_reversi_movimientos_legales($tablero, $lado);
    if (!$movimientos) {
        return null;
    }

    $rival = $lado === 1 ? 2 : 1;
    $mejorMov = null;
    $mejorValor = -PHP_FLOAT_MAX;

    foreach ($movimientos as $mov) {
        $siguiente = rh_reversi_aplicar($tablero, $mov, $lado);
        $valor = -rh_reversi_minimax($siguiente, $rival, $profundidad - 1, -PHP_FLOAT_MAX, PHP_FLOAT_MAX);
        if ($valor > $mejorValor) {
            $mejorValor = $valor;
            $mejorMov = $mov;
        }
    }

    return $mejorMov;
}

/**
 * Resuelve el turno completo de la IA: si no tiene movimiento, no hace nada
 * (el turno vuelve al humano sin pasar por acá — lo decide el endpoint).
 *
 * @return array{tablero:string, jugada: array{fila:int,col:int,volteadas:list<array{0:int,1:int}>}}|null
 */
function rh_reversi_turno_ia(string $tablero, int $ladoIA): ?array
{
    $jugada = rh_reversi_ia_elegir($tablero, $ladoIA);
    if ($jugada === null) {
        return null;
    }
    $nuevoTablero = rh_reversi_aplicar($tablero, $jugada, $ladoIA);
    return ['tablero' => $nuevoTablero, 'jugada' => $jugada];
}

/**
 * Puntos por duelo — mismo orden de magnitud que rh_damas_puntos(), pero acá
 * hace falta un tercer caso: a diferencia de Damas/Ajedrez, Reversi puede
 * terminar en empate real (mismo conteo de fichas para los dos lados).
 */
function rh_reversi_puntos(string $resultado): int
{
    return match ($resultado) {
        'gane' => 120,
        'empate' => 60,
        default => 30,
    };
}
