<?php
/**
 * HueTaTeTi (Ta-Te-Ti / tres en línea) — 1 contra 1, tablero 3x3. Mismo
 * esquema que damas.php/reversi.php: string de 9 caracteres, todo
 * server-authoritative, sin "motor" en el cliente.
 *
 * A diferencia de Damas/Reversi, el árbol de jugadas de TaTeTi es chico
 * (como mucho 9! = 362880 hojas, y baja rápido con cada jugada): la IA hace
 * minimax completo, sin poda ni tope de profundidad — juega perfecto, nunca
 * pierde. No hace falta la salvedad de "IA acotada, no óptima" que sí
 * aplica a los otros juegos de este archivo.
 */

const RH_TATETI_FILAS = 3;
const RH_TATETI_COLS = 3;

function rh_tateti_inicial(): string
{
    return str_repeat('0', RH_TATETI_FILAS * RH_TATETI_COLS);
}

/** Las 8 líneas ganadoras posibles, como índices de celda (fila*3+col). */
const RH_TATETI_LINEAS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
    [0, 4, 8], [2, 4, 6],           // diagonales
];

/** @return list<array{fila:int,col:int}> */
function rh_tateti_movimientos_legales(string $tablero, int $lado): array
{
    $legales = [];
    for ($i = 0; $i < 9; $i++) {
        if ($tablero[$i] === '0') {
            $legales[] = ['fila' => intdiv($i, 3), 'col' => $i % 3];
        }
    }
    return $legales;
}

function rh_tateti_aplicar(string $tablero, int $fila, int $col, int $lado): string
{
    $tablero[$fila * 3 + $col] = (string) $lado;
    return $tablero;
}

function rh_tateti_gano(string $tablero, int $lado): bool
{
    $ficha = (string) $lado;
    foreach (RH_TATETI_LINEAS as $linea) {
        if ($tablero[$linea[0]] === $ficha && $tablero[$linea[1]] === $ficha && $tablero[$linea[2]] === $ficha) {
            return true;
        }
    }
    return false;
}

/** La línea ganadora (3 celdas), para resaltarla en pantalla. [] si no ganó. */
function rh_tateti_linea_ganadora(string $tablero, int $lado): array
{
    $ficha = (string) $lado;
    foreach (RH_TATETI_LINEAS as $linea) {
        if ($tablero[$linea[0]] === $ficha && $tablero[$linea[1]] === $ficha && $tablero[$linea[2]] === $ficha) {
            return array_map(fn (int $i) => ['fila' => intdiv($i, 3), 'col' => $i % 3], $linea);
        }
    }
    return [];
}

function rh_tateti_empatado(string $tablero): bool
{
    return strpos($tablero, '0') === false;
}

/**
 * Negamax completo (sin poda ni tope): el árbol es chico de sobra para
 * resolverlo entero. Devuelve el valor de `$tablero` desde el punto de vista
 * de `$lado`, asumiendo que quien jugó último fue el rival.
 */
function rh_tateti_negamax(string $tablero, int $lado): int
{
    $rival = $lado === 1 ? 2 : 1;
    if (rh_tateti_gano($tablero, $rival)) {
        return -10;
    }
    if (rh_tateti_empatado($tablero)) {
        return 0;
    }
    $mejor = -100;
    for ($i = 0; $i < 9; $i++) {
        if ($tablero[$i] !== '0') {
            continue;
        }
        $siguiente = $tablero;
        $siguiente[$i] = (string) $lado;
        $valor = -rh_tateti_negamax($siguiente, $rival);
        if ($valor > $mejor) {
            $mejor = $valor;
        }
    }
    return $mejor;
}

/** @return array{fila:int,col:int}|null */
function rh_tateti_ia_elegir(string $tablero, int $lado): ?array
{
    $legales = rh_tateti_movimientos_legales($tablero, $lado);
    if (!$legales) {
        return null;
    }
    $rival = $lado === 1 ? 2 : 1;
    $mejorMov = null;
    $mejorValor = -100;
    foreach ($legales as $m) {
        $siguiente = rh_tateti_aplicar($tablero, $m['fila'], $m['col'], $lado);
        $valor = -rh_tateti_negamax($siguiente, $rival);
        if ($valor > $mejorValor) {
            $mejorValor = $valor;
            $mejorMov = $m;
        }
    }
    return $mejorMov;
}

/** @return array{tablero:string, jugada: array{fila:int,col:int}}|null */
function rh_tateti_turno_ia(string $tablero, int $ladoIA): ?array
{
    $mov = rh_tateti_ia_elegir($tablero, $ladoIA);
    if ($mov === null) {
        return null;
    }
    $nuevoTablero = rh_tateti_aplicar($tablero, $mov['fila'], $mov['col'], $ladoIA);
    return ['tablero' => $nuevoTablero, 'jugada' => $mov];
}

/** Puntos por duelo — mismo criterio que rh_c4_puntos(). */
function rh_tateti_puntos(bool $gano, bool $empate): int
{
    if ($empate) {
        return 60;
    }
    return $gano ? 120 : 30;
}
