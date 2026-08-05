<?php
/**
 * HueConecta: el Conecta 4 de HuePlay.
 *
 * Toda la lógica vive en el servidor. Es la diferencia central con HueMatch:
 * allá el celular calcula el puntaje y el servidor sólo lo acota, acá el
 * servidor decide si la jugada es legal y quién ganó. El cliente no puede
 * hacer trampa porque no tiene voz en el resultado.
 *
 * El tablero es un string de 42 caracteres, fila por fila de arriba hacia
 * abajo: '0' vacío, '1' el retador, '2' el retado.
 */

const RH_C4_FILAS = 6;
const RH_C4_COLUMNAS = 7;

function rh_c4_vacio(): string
{
    return str_repeat('0', RH_C4_FILAS * RH_C4_COLUMNAS);
}

function rh_c4_indice(int $fila, int $col): int
{
    return $fila * RH_C4_COLUMNAS + $col;
}

function rh_c4_celda(string $t, int $fila, int $col): string
{
    if ($fila < 0 || $fila >= RH_C4_FILAS || $col < 0 || $col >= RH_C4_COLUMNAS) {
        return '';
    }
    return $t[rh_c4_indice($fila, $col)];
}

/**
 * Deja caer una ficha en una columna.
 *
 * @return array{tablero:string, fila:int}|null  null si la columna no existe
 *                                               o está llena.
 */
function rh_c4_soltar(string $tablero, int $col, string $ficha): ?array
{
    if ($col < 0 || $col >= RH_C4_COLUMNAS) {
        return null;
    }

    // Se busca desde abajo: la ficha se apoya sobre la primera casilla libre.
    for ($fila = RH_C4_FILAS - 1; $fila >= 0; $fila--) {
        $i = rh_c4_indice($fila, $col);
        if ($tablero[$i] === '0') {
            $tablero[$i] = $ficha;
            return ['tablero' => $tablero, 'fila' => $fila];
        }
    }

    return null;
}

/**
 * ¿La ficha recién puesta en (fila, col) armó cuatro en línea?
 *
 * Sólo se revisan las cuatro direcciones que pasan por la última jugada, no el
 * tablero entero: si antes no había línea, la única que puede haber aparecido
 * es una que incluya esa ficha.
 */
function rh_c4_gano(string $tablero, int $fila, int $col): bool
{
    $ficha = rh_c4_celda($tablero, $fila, $col);
    if ($ficha === '0' || $ficha === '') {
        return false;
    }

    $direcciones = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal \
        [1, -1],  // diagonal /
    ];

    foreach ($direcciones as [$df, $dc]) {
        $largo = 1;

        // Se cuenta hacia los dos lados desde la ficha nueva.
        foreach ([1, -1] as $sentido) {
            $f = $fila + $df * $sentido;
            $c = $col + $dc * $sentido;
            while (rh_c4_celda($tablero, $f, $c) === $ficha) {
                $largo++;
                $f += $df * $sentido;
                $c += $dc * $sentido;
            }
        }

        if ($largo >= 4) {
            return true;
        }
    }

    return false;
}

function rh_c4_lleno(string $tablero): bool
{
    return strpos($tablero, '0') === false;
}

/** Columnas donde todavía entra una ficha, para que el front deshabilite el resto. */
function rh_c4_columnas_libres(string $tablero): array
{
    $libres = [];
    for ($col = 0; $col < RH_C4_COLUMNAS; $col++) {
        if (rh_c4_celda($tablero, 0, $col) === '0') {
            $libres[] = $col;
        }
    }
    return $libres;
}

/**
 * Las 4 celdas de la línea ganadora, para poder resaltarla en la pantalla.
 * Devuelve [] si esa jugada no ganó.
 */
function rh_c4_linea_ganadora(string $tablero, int $fila, int $col): array
{
    $ficha = rh_c4_celda($tablero, $fila, $col);
    if ($ficha === '0' || $ficha === '') {
        return [];
    }

    foreach ([[0, 1], [1, 0], [1, 1], [1, -1]] as [$df, $dc]) {
        $celdas = [['fila' => $fila, 'col' => $col]];

        foreach ([1, -1] as $sentido) {
            $f = $fila + $df * $sentido;
            $c = $col + $dc * $sentido;
            while (rh_c4_celda($tablero, $f, $c) === $ficha) {
                $celdas[] = ['fila' => $f, 'col' => $c];
                $f += $df * $sentido;
                $c += $dc * $sentido;
            }
        }

        if (count($celdas) >= 4) {
            return $celdas;
        }
    }

    return [];
}

/**
 * Puntos que deja una partida de HueConecta.
 *
 * Es fijo y lo calcula el servidor, no el cliente: en un juego de turnos no hay
 * "puntaje de la partida" que el celular pueda informar. Perder también suma
 * algo, para que aceptar un duelo contra alguien mejor no sea un castigo.
 */
function rh_c4_puntos(bool $gano, bool $empate): int
{
    if ($empate) {
        return 60;
    }
    return $gano ? 120 : 30;
}
