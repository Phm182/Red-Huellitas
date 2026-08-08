<?php
/**
 * HueDamas: las damas de HuePlay, reglas argentinas sobre tablero 8x8.
 *
 * Mismo criterio que HueConecta (`hueconecta.php`): toda la lógica vive en el
 * servidor, el cliente sólo manda "desde -> hasta" y no tiene voz en si la
 * jugada es legal ni en el resultado.
 *
 * El tablero es un string de 64 caracteres, fila por fila de arriba hacia
 * abajo, índice `fila*8+col`: '0' vacío, '1'/'3' ficha/dama del retador,
 * '2'/'4' ficha/dama del retado. El retador arranca arriba (filas 0-2) y avanza
 * hacia fila creciente; el retado arranca abajo (filas 5-7) y avanza hacia fila
 * decreciente.
 *
 * Reglas implementadas: movimiento simple diagonal de un paso, captura
 * obligatoria (en las 4 diagonales, no sólo hacia adelante — regla FMJD/
 * argentina), multi-captura en cadena obligatoria con la misma ficha, dama
 * "voladora" (se mueve cualquier distancia en diagonal).
 *
 * Dos simplificaciones deliberadas, documentadas para poder ajustarlas si
 * hace falta:
 * 1. Cuando hay varias cadenas de captura posibles, cualquiera es válida para
 *    arrancar — no se fuerza la regla de "captura obligatoria por mayoría"
 *    (elegir la que come más fichas).
 * 2. Al capturar, la dama aterriza siempre en la casilla inmediata después de
 *    la ficha comida (no en cualquiera de las casillas libres siguientes de
 *    esa diagonal). El movimiento SIN captura sí es libre a cualquier
 *    distancia. Esto simplifica la generación de cadenas de captura sin
 *    perder la sensación de "dama voladora".
 * 3. Una ficha que corona a mitad de una cadena de captura corta el turno ahí
 *    (no sigue comiendo como dama en la misma jugada) — convención habitual.
 */

const RH_DAMAS_FILAS = 8;
const RH_DAMAS_COLUMNAS = 8;
const RH_DAMAS_DIRECCIONES = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const RH_DAMAS_IA_PROFUNDIDAD = 4;

function rh_damas_indice(int $fila, int $col): int
{
    return $fila * RH_DAMAS_COLUMNAS + $col;
}

function rh_damas_celda(string $t, int $fila, int $col): string
{
    if ($fila < 0 || $fila >= RH_DAMAS_FILAS || $col < 0 || $col >= RH_DAMAS_COLUMNAS) {
        return '';
    }
    return $t[rh_damas_indice($fila, $col)];
}

function rh_damas_lado_de(string $pieza): int
{
    return ($pieza === '1' || $pieza === '3') ? 1 : 2;
}

function rh_damas_es_dama(string $pieza): bool
{
    return $pieza === '3' || $pieza === '4';
}

/** Tablero inicial: 12 fichas simples por lado, en las 3 filas de cada extremo. */
function rh_damas_inicial(): string
{
    $t = str_repeat('0', RH_DAMAS_FILAS * RH_DAMAS_COLUMNAS);

    for ($fila = 0; $fila < 3; $fila++) {
        for ($col = 0; $col < RH_DAMAS_COLUMNAS; $col++) {
            if (($fila + $col) % 2 === 1) {
                $t[rh_damas_indice($fila, $col)] = '1';
            }
        }
    }
    for ($fila = RH_DAMAS_FILAS - 3; $fila < RH_DAMAS_FILAS; $fila++) {
        for ($col = 0; $col < RH_DAMAS_COLUMNAS; $col++) {
            if (($fila + $col) % 2 === 1) {
                $t[rh_damas_indice($fila, $col)] = '2';
            }
        }
    }

    return $t;
}

/**
 * Todas las cadenas de captura que puede armar UNA ficha desde su posición.
 *
 * Las piezas comidas se sacan del tablero de trabajo apenas se saltan (no
 * recién al final de la cadena): simplifica la búsqueda y sólo cambiaría el
 * resultado en posiciones extremadamente raras donde convendría "esquivar" una
 * pieza propia ya comida en el mismo turno.
 *
 * @return array<int, array{saltos: array, corona: bool}>
 */
function rh_damas_cadena_capturas(string $tablero, int $fila, int $col, string $pieza): array
{
    $lado = rh_damas_lado_de($pieza);
    $dama = rh_damas_es_dama($pieza);
    $cadenas = [];

    foreach (RH_DAMAS_DIRECCIONES as [$df, $dc]) {
        if ($dama) {
            $f = $fila + $df;
            $c = $col + $dc;
            while (rh_damas_celda($tablero, $f, $c) === '0') {
                $f += $df;
                $c += $dc;
            }
            $encontrada = rh_damas_celda($tablero, $f, $c);
            if ($encontrada === '' || rh_damas_lado_de($encontrada) === $lado) {
                continue;
            }
            $fAterrizaje = $f + $df;
            $cAterrizaje = $c + $dc;
            if (rh_damas_celda($tablero, $fAterrizaje, $cAterrizaje) !== '0') {
                continue;
            }
            $comidaFila = $f;
            $comidaCol = $c;
        } else {
            $fComida = $fila + $df;
            $cComida = $col + $dc;
            $vecino = rh_damas_celda($tablero, $fComida, $cComida);
            if ($vecino === '' || $vecino === '0' || rh_damas_lado_de($vecino) === $lado) {
                continue;
            }
            $fAterrizaje = $fila + 2 * $df;
            $cAterrizaje = $col + 2 * $dc;
            if (rh_damas_celda($tablero, $fAterrizaje, $cAterrizaje) !== '0') {
                continue;
            }
            $comidaFila = $fComida;
            $comidaCol = $cComida;
        }

        $siguienteTablero = $tablero;
        $siguienteTablero[rh_damas_indice($fila, $col)] = '0';
        $siguienteTablero[rh_damas_indice($comidaFila, $comidaCol)] = '0';

        $corono = false;
        $piezaFinal = $pieza;
        if (!$dama && (($lado === 1 && $fAterrizaje === RH_DAMAS_FILAS - 1) || ($lado === 2 && $fAterrizaje === 0))) {
            $piezaFinal = $lado === 1 ? '3' : '4';
            $corono = true;
        }
        $siguienteTablero[rh_damas_indice($fAterrizaje, $cAterrizaje)] = $piezaFinal;

        $salto = [
            'desde' => ['fila' => $fila, 'col' => $col],
            'hasta' => ['fila' => $fAterrizaje, 'col' => $cAterrizaje],
            'comida' => ['fila' => $comidaFila, 'col' => $comidaCol],
        ];

        if ($corono) {
            // Corona a mitad de cadena: corta el turno ahí.
            $cadenas[] = ['saltos' => [$salto], 'corona' => true];
            continue;
        }

        $siguientes = rh_damas_cadena_capturas($siguienteTablero, $fAterrizaje, $cAterrizaje, $piezaFinal);
        if (empty($siguientes)) {
            $cadenas[] = ['saltos' => [$salto], 'corona' => false];
        } else {
            foreach ($siguientes as $resto) {
                $cadenas[] = ['saltos' => array_merge([$salto], $resto['saltos']), 'corona' => $resto['corona']];
            }
        }
    }

    return $cadenas;
}

/**
 * Movimientos legales de $lado (1|2). Si hay al menos una captura disponible,
 * son las únicas legales (captura obligatoria) — cada una ya expandida como
 * cadena completa para que el front anime todos los saltos del turno.
 *
 * @return array<int, array{desde: array, hasta: array, saltos: array, corona: bool}>
 */
function rh_damas_movimientos_legales(string $tablero, int $lado): array
{
    $capturas = [];
    for ($i = 0; $i < RH_DAMAS_FILAS * RH_DAMAS_COLUMNAS; $i++) {
        $pieza = $tablero[$i];
        if ($pieza === '0' || rh_damas_lado_de($pieza) !== $lado) {
            continue;
        }
        $fila = intdiv($i, RH_DAMAS_COLUMNAS);
        $col = $i % RH_DAMAS_COLUMNAS;

        foreach (rh_damas_cadena_capturas($tablero, $fila, $col, $pieza) as $cadena) {
            $ultimo = end($cadena['saltos']);
            $capturas[] = [
                'desde' => ['fila' => $fila, 'col' => $col],
                'hasta' => $ultimo['hasta'],
                'saltos' => $cadena['saltos'],
                'corona' => $cadena['corona'],
            ];
        }
    }

    if (!empty($capturas)) {
        return $capturas;
    }

    $simples = [];
    for ($i = 0; $i < RH_DAMAS_FILAS * RH_DAMAS_COLUMNAS; $i++) {
        $pieza = $tablero[$i];
        if ($pieza === '0' || rh_damas_lado_de($pieza) !== $lado) {
            continue;
        }
        $fila = intdiv($i, RH_DAMAS_COLUMNAS);
        $col = $i % RH_DAMAS_COLUMNAS;

        if (rh_damas_es_dama($pieza)) {
            foreach (RH_DAMAS_DIRECCIONES as [$df, $dc]) {
                $f = $fila + $df;
                $c = $col + $dc;
                while (rh_damas_celda($tablero, $f, $c) === '0') {
                    $simples[] = [
                        'desde' => ['fila' => $fila, 'col' => $col],
                        'hasta' => ['fila' => $f, 'col' => $c],
                        // Un movimiento simple también lleva un "salto" (con
                        // `comida = null`): así el front siempre tiene algo
                        // que animar, sea captura o no, sin tener que mirar
                        // un campo aparte para saber a dónde se movió.
                        'saltos' => [['desde' => ['fila' => $fila, 'col' => $col], 'hasta' => ['fila' => $f, 'col' => $c], 'comida' => null]],
                        'corona' => false,
                    ];
                    $f += $df;
                    $c += $dc;
                }
            }
            continue;
        }

        $df = $lado === 1 ? 1 : -1;
        foreach ([1, -1] as $dc) {
            $f = $fila + $df;
            $c = $col + $dc;
            if (rh_damas_celda($tablero, $f, $c) === '0') {
                $corona = ($lado === 1 && $f === RH_DAMAS_FILAS - 1) || ($lado === 2 && $f === 0);
                $simples[] = [
                    'desde' => ['fila' => $fila, 'col' => $col],
                    'hasta' => ['fila' => $f, 'col' => $c],
                    'saltos' => [['desde' => ['fila' => $fila, 'col' => $col], 'hasta' => ['fila' => $f, 'col' => $c], 'comida' => null]],
                    'corona' => $corona,
                ];
            }
        }
    }

    return $simples;
}

/** Aplica un movimiento YA VALIDADO (uno de los que devuelve la función de arriba). */
function rh_damas_aplicar(string $tablero, array $movimiento): string
{
    $desde = $movimiento['desde'];
    $hasta = $movimiento['hasta'];
    $pieza = $tablero[rh_damas_indice($desde['fila'], $desde['col'])];
    $tablero[rh_damas_indice($desde['fila'], $desde['col'])] = '0';

    foreach ($movimiento['saltos'] as $salto) {
        if ($salto['comida'] !== null) {
            $tablero[rh_damas_indice($salto['comida']['fila'], $salto['comida']['col'])] = '0';
        }
    }

    if ($movimiento['corona']) {
        $pieza = rh_damas_lado_de($pieza) === 1 ? '3' : '4';
    }
    $tablero[rh_damas_indice($hasta['fila'], $hasta['col'])] = $pieza;

    return $tablero;
}

/** $lado se quedó sin fichas o sin movimientos legales → pierde. */
function rh_damas_termino(string $tablero, int $lado): bool
{
    return empty(rh_damas_movimientos_legales($tablero, $lado));
}

/**
 * Material + movilidad simple: fichas 100, damas 130, con un bono chico de
 * avance para las fichas simples (más cerca de coronar, mejor). Valor desde
 * la perspectiva de $lado (positivo = mejor para $lado).
 */
function rh_damas_heuristica(string $tablero, int $lado): int
{
    $valor = 0;
    for ($i = 0; $i < RH_DAMAS_FILAS * RH_DAMAS_COLUMNAS; $i++) {
        $pieza = $tablero[$i];
        if ($pieza === '0') {
            continue;
        }
        $l = rh_damas_lado_de($pieza);
        $peso = rh_damas_es_dama($pieza) ? 130 : 100;
        if (!rh_damas_es_dama($pieza)) {
            $fila = intdiv($i, RH_DAMAS_COLUMNAS);
            $avance = $l === 1 ? $fila : (RH_DAMAS_FILAS - 1 - $fila);
            $peso += $avance * 2;
        }
        $valor += ($l === $lado) ? $peso : -$peso;
    }
    return $valor;
}

/** Negamax con poda alfa-beta, profundidad chica: rival "de práctica", no de torneo. */
function rh_damas_minimax(string $tablero, int $lado, int $profundidad, int $alfa, int $beta): int
{
    $movimientos = rh_damas_movimientos_legales($tablero, $lado);
    if (empty($movimientos)) {
        // Sin movimientos, $lado pierde: valor muy negativo para quien mueve
        // ahora. El término de profundidad prefiere ganar antes que después.
        return -100000 + (RH_DAMAS_IA_PROFUNDIDAD - $profundidad);
    }
    if ($profundidad <= 0) {
        return rh_damas_heuristica($tablero, $lado);
    }

    $mejor = -PHP_INT_MAX;
    foreach ($movimientos as $m) {
        $siguiente = rh_damas_aplicar($tablero, $m);
        $valor = -rh_damas_minimax($siguiente, $lado === 1 ? 2 : 1, $profundidad - 1, -$beta, -$alfa);
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

/** El movimiento que elige la IA para $lado, o null si no tiene ninguno (perdió). */
function rh_damas_ia_elegir(string $tablero, int $lado, int $profundidad = RH_DAMAS_IA_PROFUNDIDAD): ?array
{
    $movimientos = rh_damas_movimientos_legales($tablero, $lado);
    if (empty($movimientos)) {
        return null;
    }

    $mejor = null;
    $mejorValor = -PHP_INT_MAX;

    foreach ($movimientos as $m) {
        $siguiente = rh_damas_aplicar($tablero, $m);
        $valor = -rh_damas_minimax($siguiente, $lado === 1 ? 2 : 1, $profundidad - 1, -PHP_INT_MAX, PHP_INT_MAX);
        if ($valor > $mejorValor) {
            $mejorValor = $valor;
            $mejor = $m;
        }
    }

    return $mejor;
}

/** Puntos que deja una partida de Damas. Mismo criterio que rh_c4_puntos(). */
function rh_damas_puntos(bool $gano): int
{
    return $gano ? 120 : 30;
}

/**
 * Resuelve el turno de la IA sobre un tablero dado — no toca la base, sólo
 * calcula. La usan tanto `desafio_crear.php` (si le toca arrancar al bot)
 * como `damas_mover.php` (la respuesta del bot tras la jugada humana), cada
 * uno decide cómo persistir el resultado.
 *
 * @return array{tablero: string, jugada: ?array, terminoLado: ?int} `terminoLado`
 *         es 1 o 2 si ESE lado se quedó sin movimientos después de esta
 *         jugada (perdió), o `null` si la partida sigue.
 */
function rh_damas_turno_ia(string $tablero, int $ladoIA): array
{
    // La IA no tiene movimiento propio: pierde sin llegar a jugar (posición
    // heredada ya bloqueada — no debería pasar en la práctica, pero se cubre).
    if (rh_damas_termino($tablero, $ladoIA)) {
        return ['tablero' => $tablero, 'jugada' => null, 'terminoLado' => $ladoIA];
    }

    $mov = rh_damas_ia_elegir($tablero, $ladoIA);
    $tablero = rh_damas_aplicar($tablero, $mov);

    $rival = $ladoIA === 1 ? 2 : 1;
    $terminoLado = rh_damas_termino($tablero, $rival) ? $rival : null;

    return ['tablero' => $tablero, 'jugada' => $mov, 'terminoLado' => $terminoLado];
}
