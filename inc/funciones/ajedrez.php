<?php
/**
 * HueAjedrez: el ajedrez de HuePlay. Mismo criterio que HueConecta y Damas
 * (`hueconecta.php`, `damas.php`): toda la lógica vive en el servidor, el
 * cliente sólo manda "desde -> hasta" y no tiene voz en si la jugada es legal
 * ni en el resultado.
 *
 * El tablero es un string de **70 caracteres**: los primeros 64 son las
 * casillas (índice `fila*8+col`, fila 0 arriba), con letras en vez de dígitos
 * porque hacen falta 6 tipos de pieza por lado — mayúscula el retador
 * (P/N/B/R/Q/K), minúscula el retado (p/n/b/r/q/k), '.' vacío. Los 6
 * caracteres finales son estado extra que el tablero por sí solo no alcanza a
 * expresar: 4 de derecho de enroque estilo FEN ("KQkq", cada uno "-" si ese
 * lado ya lo perdió) y 2 de la casilla objetivo de captura al paso ("--" si
 * no aplica, o "fc" con fila+columna si el último movimiento fue un peón
 * avanzando dos casillas).
 *
 * Deliberadamente NO se implementan (documentado para no tener que
 * redescubrirlo): la regla de 50 movimientos sin captura ni peón, la triple
 * repetición de posición, ni el empate por material insuficiente. Sin esto
 * una partida sin jaque mate ni ahogado sigue indefinidamente, pero el plazo
 * de turno configurable (compartido con todos los juegos por turnos) le pone
 * un techo real: si nadie corta, se resuelve solo por vencimiento.
 *
 * La promoción es siempre a dama, automática — no hay "under-promotion" a
 * torre/alfil/caballo. Decisión de alcance explícita, mismo criterio que la
 * "captura por mayoría" que Damas tampoco fuerza.
 */

const RH_AJEDREZ_FILAS = 8;
const RH_AJEDREZ_COLUMNAS = 8;
// Profundidad 2 y no 3: el factor de ramificación del ajedrez (~35) es mucho
// mayor que el de damas (~7). En la verificación, profundidad 3 llegó a
// tardar ~0.9s por jugada desde la posición inicial — demasiado para un
// request síncrono. A profundidad 2 el promedio medido fue ~200ms.
const RH_AJEDREZ_IA_PROFUNDIDAD = 2;

function rh_ajedrez_indice(int $fila, int $col): int
{
    return $fila * RH_AJEDREZ_COLUMNAS + $col;
}

function rh_ajedrez_celda(string $tablero, int $fila, int $col): string
{
    if ($fila < 0 || $fila >= RH_AJEDREZ_FILAS || $col < 0 || $col >= RH_AJEDREZ_COLUMNAS) {
        return '';
    }
    return $tablero[rh_ajedrez_indice($fila, $col)];
}

function rh_ajedrez_lado_de(string $pieza): int
{
    return ctype_upper($pieza) ? 1 : 2;
}

function rh_ajedrez_enroque_estado(string $tablero): string
{
    return substr($tablero, 64, 4);
}

/** La casilla objetivo de una captura al paso vigente, o null si no hay. */
function rh_ajedrez_al_paso(string $tablero): ?array
{
    $s = substr($tablero, 68, 2);
    if ($s === '--') {
        return null;
    }
    return ['fila' => (int) $s[0], 'col' => (int) $s[1]];
}

function rh_ajedrez_con_estado(string $tableroBase, string $enroque4, ?array $alPaso): string
{
    $ep = $alPaso ? ((string) $alPaso['fila'] . (string) $alPaso['col']) : '--';
    return $tableroBase . $enroque4 . $ep;
}

/** Tablero inicial: la posición estándar, con los 4 derechos de enroque y sin al paso. */
function rh_ajedrez_inicial(): string
{
    $filaAlta = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    $t = implode('', $filaAlta)
        . str_repeat('P', 8)
        . str_repeat('.', 8 * 4)
        . str_repeat('p', 8)
        . implode('', array_map('strtolower', $filaAlta));
    return rh_ajedrez_con_estado($t, 'KQkq', null);
}

function rh_ajedrez_rey_pos(string $tablero, int $lado): ?array
{
    $reyChar = $lado === 1 ? 'K' : 'k';
    $i = strpos($tablero, $reyChar);
    // Sólo mirar entre las 64 casillas: el sufijo de estado nunca tiene 'K'/'k'
    // salvo el propio carácter de enroque, que cae fuera de este rango.
    if ($i === false || $i >= 64) {
        return null;
    }
    return ['fila' => intdiv($i, RH_AJEDREZ_COLUMNAS), 'col' => $i % RH_AJEDREZ_COLUMNAS];
}

/**
 * ¿La casilla (fila,col) está atacada por $ladoAtacante? Es la pieza clave
 * del motor: la reusan la detección de jaque y la validación de enroque (el
 * rey no puede pasar ni terminar en una casilla atacada).
 */
function rh_ajedrez_casilla_atacada(string $tablero, int $fila, int $col, int $ladoAtacante): bool
{
    // Peones: atacan en diagonal hacia su propio "adelante". Si ladoAtacante
    // avanza en +1 (retador), el peón que ataca (fila,col) está en fila-1.
    $dfPeon = $ladoAtacante === 1 ? -1 : 1;
    foreach ([-1, 1] as $dc) {
        $p = rh_ajedrez_celda($tablero, $fila + $dfPeon, $col + $dc);
        if ($p !== '' && $p !== '.' && strtoupper($p) === 'P' && rh_ajedrez_lado_de($p) === $ladoAtacante) {
            return true;
        }
    }

    foreach ([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] as [$df, $dc]) {
        $p = rh_ajedrez_celda($tablero, $fila + $df, $col + $dc);
        if ($p !== '' && $p !== '.' && strtoupper($p) === 'N' && rh_ajedrez_lado_de($p) === $ladoAtacante) {
            return true;
        }
    }

    for ($df = -1; $df <= 1; $df++) {
        for ($dc = -1; $dc <= 1; $dc++) {
            if ($df === 0 && $dc === 0) {
                continue;
            }
            $p = rh_ajedrez_celda($tablero, $fila + $df, $col + $dc);
            if ($p !== '' && $p !== '.' && strtoupper($p) === 'K' && rh_ajedrez_lado_de($p) === $ladoAtacante) {
                return true;
            }
        }
    }

    foreach ([[0, 1], [0, -1], [1, 0], [-1, 0]] as [$df, $dc]) {
        $f = $fila + $df;
        $c = $col + $dc;
        while (($p = rh_ajedrez_celda($tablero, $f, $c)) !== '') {
            if ($p !== '.') {
                if (rh_ajedrez_lado_de($p) === $ladoAtacante && in_array(strtoupper($p), ['R', 'Q'], true)) {
                    return true;
                }
                break;
            }
            $f += $df;
            $c += $dc;
        }
    }

    foreach ([[1, 1], [1, -1], [-1, 1], [-1, -1]] as [$df, $dc]) {
        $f = $fila + $df;
        $c = $col + $dc;
        while (($p = rh_ajedrez_celda($tablero, $f, $c)) !== '') {
            if ($p !== '.') {
                if (rh_ajedrez_lado_de($p) === $ladoAtacante && in_array(strtoupper($p), ['B', 'Q'], true)) {
                    return true;
                }
                break;
            }
            $f += $df;
            $c += $dc;
        }
    }

    return false;
}

function rh_ajedrez_rey_en_jaque(string $tablero, int $lado): bool
{
    $pos = rh_ajedrez_rey_pos($tablero, $lado);
    if (!$pos) {
        return false;
    }
    $rival = $lado === 1 ? 2 : 1;
    return rh_ajedrez_casilla_atacada($tablero, $pos['fila'], $pos['col'], $rival);
}

function rh_ajedrez_mov(array $desde, array $hasta, bool $captura, ?array $capturaEn, ?array $enroque, bool $promocion): array
{
    return ['desde' => $desde, 'hasta' => $hasta, 'captura' => $captura, 'capturaEn' => $capturaEn, 'enroque' => $enroque, 'promocion' => $promocion];
}

/** Caballo y rey: un solo paso por cada offset de la lista. */
function rh_ajedrez_movs_salto(string $tablero, int $fila, int $col, int $lado, array $offsets): array
{
    $movs = [];
    foreach ($offsets as [$df, $dc]) {
        $f = $fila + $df;
        $c = $col + $dc;
        $destino = rh_ajedrez_celda($tablero, $f, $c);
        if ($destino === '' || ($destino !== '.' && rh_ajedrez_lado_de($destino) === $lado)) {
            continue;
        }
        $captura = $destino !== '.';
        $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $f, 'col' => $c], $captura, $captura ? ['fila' => $f, 'col' => $c] : null, null, false);
    }
    return $movs;
}

/** Alfil, torre y dama: rayos hasta chocar con algo. */
function rh_ajedrez_movs_deslizante(string $tablero, int $fila, int $col, int $lado, array $direcciones): array
{
    $movs = [];
    foreach ($direcciones as [$df, $dc]) {
        $f = $fila + $df;
        $c = $col + $dc;
        while (($destino = rh_ajedrez_celda($tablero, $f, $c)) !== '') {
            if ($destino === '.') {
                $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $f, 'col' => $c], false, null, null, false);
            } else {
                if (rh_ajedrez_lado_de($destino) !== $lado) {
                    $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $f, 'col' => $c], true, ['fila' => $f, 'col' => $c], null, false);
                }
                break;
            }
            $f += $df;
            $c += $dc;
        }
    }
    return $movs;
}

/** Peón: avance simple/doble, capturas diagonales (con al paso) y promoción. */
function rh_ajedrez_movs_peon(string $tablero, int $fila, int $col, int $lado): array
{
    $movs = [];
    $df = $lado === 1 ? 1 : -1;
    $filaInicial = $lado === 1 ? 1 : 6;
    $filaPromocion = $lado === 1 ? 7 : 0;

    $f1 = $fila + $df;
    if (rh_ajedrez_celda($tablero, $f1, $col) === '.') {
        $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $f1, 'col' => $col], false, null, null, $f1 === $filaPromocion);
        $f2 = $fila + 2 * $df;
        if ($fila === $filaInicial && rh_ajedrez_celda($tablero, $f2, $col) === '.') {
            $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $f2, 'col' => $col], false, null, null, false);
        }
    }

    $alPaso = rh_ajedrez_al_paso($tablero);
    foreach ([-1, 1] as $dc) {
        $fc = $fila + $df;
        $cc = $col + $dc;
        $destino = rh_ajedrez_celda($tablero, $fc, $cc);
        if ($destino === '') {
            continue;
        }
        if ($destino !== '.' && rh_ajedrez_lado_de($destino) !== $lado) {
            $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $fc, 'col' => $cc], true, ['fila' => $fc, 'col' => $cc], null, $fc === $filaPromocion);
        } elseif ($destino === '.' && $alPaso && $alPaso['fila'] === $fc && $alPaso['col'] === $cc) {
            // La pieza comida al paso está en la fila del peón que mueve, no en la de destino.
            $movs[] = rh_ajedrez_mov(['fila' => $fila, 'col' => $col], ['fila' => $fc, 'col' => $cc], true, ['fila' => $fila, 'col' => $cc], null, false);
        }
    }

    return $movs;
}

/** Enroque corto y largo, con las 3 condiciones de siempre: nadie se movió,
 *  las casillas intermedias están vacías, y el rey ni pasa ni termina en
 *  jaque (el "termina" lo termina de filtrar movimientos_legales). */
function rh_ajedrez_movs_enroque(string $tablero, int $fila, int $col, int $lado): array
{
    $movs = [];
    $filaBase = $lado === 1 ? 0 : 7;
    if ($fila !== $filaBase || $col !== 4) {
        return $movs;
    }
    $rival = $lado === 1 ? 2 : 1;
    if (rh_ajedrez_casilla_atacada($tablero, $fila, $col, $rival)) {
        return $movs;
    }

    $enroque = rh_ajedrez_enroque_estado($tablero);
    $torreChar = $lado === 1 ? 'R' : 'r';

    if (strpos($enroque, $lado === 1 ? 'K' : 'k') !== false
        && rh_ajedrez_celda($tablero, $fila, 7) === $torreChar
        && rh_ajedrez_celda($tablero, $fila, 5) === '.' && rh_ajedrez_celda($tablero, $fila, 6) === '.'
        && !rh_ajedrez_casilla_atacada($tablero, $fila, 5, $rival) && !rh_ajedrez_casilla_atacada($tablero, $fila, 6, $rival)
    ) {
        $movs[] = rh_ajedrez_mov(
            ['fila' => $fila, 'col' => 4], ['fila' => $fila, 'col' => 6], false, null,
            ['torreDesde' => ['fila' => $fila, 'col' => 7], 'torreHasta' => ['fila' => $fila, 'col' => 5]], false
        );
    }

    if (strpos($enroque, $lado === 1 ? 'Q' : 'q') !== false
        && rh_ajedrez_celda($tablero, $fila, 0) === $torreChar
        && rh_ajedrez_celda($tablero, $fila, 1) === '.' && rh_ajedrez_celda($tablero, $fila, 2) === '.' && rh_ajedrez_celda($tablero, $fila, 3) === '.'
        && !rh_ajedrez_casilla_atacada($tablero, $fila, 2, $rival) && !rh_ajedrez_casilla_atacada($tablero, $fila, 3, $rival)
    ) {
        $movs[] = rh_ajedrez_mov(
            ['fila' => $fila, 'col' => 4], ['fila' => $fila, 'col' => 2], false, null,
            ['torreDesde' => ['fila' => $fila, 'col' => 0], 'torreHasta' => ['fila' => $fila, 'col' => 3]], false
        );
    }

    return $movs;
}

/** Movimientos pseudo-legales de $lado: por tipo de pieza, sin filtrar jaque propio todavía. */
function rh_ajedrez_pseudo_legales(string $tablero, int $lado): array
{
    $movs = [];
    for ($i = 0; $i < RH_AJEDREZ_FILAS * RH_AJEDREZ_COLUMNAS; $i++) {
        $p = $tablero[$i];
        if ($p === '.' || rh_ajedrez_lado_de($p) !== $lado) {
            continue;
        }
        $fila = intdiv($i, RH_AJEDREZ_COLUMNAS);
        $col = $i % RH_AJEDREZ_COLUMNAS;

        switch (strtoupper($p)) {
            case 'P':
                $movs = array_merge($movs, rh_ajedrez_movs_peon($tablero, $fila, $col, $lado));
                break;
            case 'N':
                $movs = array_merge($movs, rh_ajedrez_movs_salto($tablero, $fila, $col, $lado, [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]));
                break;
            case 'B':
                $movs = array_merge($movs, rh_ajedrez_movs_deslizante($tablero, $fila, $col, $lado, [[1, 1], [1, -1], [-1, 1], [-1, -1]]));
                break;
            case 'R':
                $movs = array_merge($movs, rh_ajedrez_movs_deslizante($tablero, $fila, $col, $lado, [[0, 1], [0, -1], [1, 0], [-1, 0]]));
                break;
            case 'Q':
                $movs = array_merge($movs, rh_ajedrez_movs_deslizante($tablero, $fila, $col, $lado, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]));
                break;
            case 'K':
                $movs = array_merge($movs, rh_ajedrez_movs_salto($tablero, $fila, $col, $lado, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]));
                $movs = array_merge($movs, rh_ajedrez_movs_enroque($tablero, $fila, $col, $lado));
                break;
        }
    }
    return $movs;
}

/** Aplica un movimiento YA VALIDADO. Actualiza tablero, derechos de enroque y objetivo de al paso. */
function rh_ajedrez_aplicar(string $tablero, array $movimiento): string
{
    $desde = $movimiento['desde'];
    $hasta = $movimiento['hasta'];
    $pieza = $tablero[rh_ajedrez_indice($desde['fila'], $desde['col'])];
    $lado = rh_ajedrez_lado_de($pieza);
    $tipo = strtoupper($pieza);

    $tablero[rh_ajedrez_indice($desde['fila'], $desde['col'])] = '.';
    if ($movimiento['capturaEn'] !== null) {
        $tablero[rh_ajedrez_indice($movimiento['capturaEn']['fila'], $movimiento['capturaEn']['col'])] = '.';
    }

    $piezaFinal = $movimiento['promocion'] ? ($lado === 1 ? 'Q' : 'q') : $pieza;
    $tablero[rh_ajedrez_indice($hasta['fila'], $hasta['col'])] = $piezaFinal;

    if ($movimiento['enroque'] !== null) {
        $torreChar = $lado === 1 ? 'R' : 'r';
        $td = $movimiento['enroque']['torreDesde'];
        $th = $movimiento['enroque']['torreHasta'];
        $tablero[rh_ajedrez_indice($td['fila'], $td['col'])] = '.';
        $tablero[rh_ajedrez_indice($th['fila'], $th['col'])] = $torreChar;
    }

    $enroque = rh_ajedrez_enroque_estado($tablero);
    if ($tipo === 'K') {
        $enroque = str_replace($lado === 1 ? ['K', 'Q'] : ['k', 'q'], '-', $enroque);
    }
    $perderDerecho = function (int $fila, int $col) use (&$enroque): void {
        if ($fila === 0 && $col === 0) {
            $enroque = substr_replace($enroque, '-', 1, 1);
        } elseif ($fila === 0 && $col === 7) {
            $enroque = substr_replace($enroque, '-', 0, 1);
        } elseif ($fila === 7 && $col === 0) {
            $enroque = substr_replace($enroque, '-', 3, 1);
        } elseif ($fila === 7 && $col === 7) {
            $enroque = substr_replace($enroque, '-', 2, 1);
        }
    };
    $perderDerecho($desde['fila'], $desde['col']);
    if ($movimiento['capturaEn'] !== null) {
        $perderDerecho($movimiento['capturaEn']['fila'], $movimiento['capturaEn']['col']);
    }

    $alPaso = null;
    if ($tipo === 'P' && abs($hasta['fila'] - $desde['fila']) === 2) {
        $alPaso = ['fila' => intdiv($hasta['fila'] + $desde['fila'], 2), 'col' => $desde['col']];
    }

    return rh_ajedrez_con_estado(substr($tablero, 0, 64), $enroque, $alPaso);
}

/** Movimientos legales de $lado: pseudo-legales que NO dejan al propio rey en jaque. */
function rh_ajedrez_movimientos_legales(string $tablero, int $lado): array
{
    $legales = [];
    foreach (rh_ajedrez_pseudo_legales($tablero, $lado) as $m) {
        $siguiente = rh_ajedrez_aplicar($tablero, $m);
        if (!rh_ajedrez_rey_en_jaque($siguiente, $lado)) {
            $legales[] = $m;
        }
    }
    return $legales;
}

/** Sin movimientos + jaque = mate; sin movimientos + sin jaque = ahogado (tablas). */
function rh_ajedrez_termino(string $tablero, int $lado): array
{
    if (!empty(rh_ajedrez_movimientos_legales($tablero, $lado))) {
        return ['terminado' => false, 'jaqueMate' => false];
    }
    return ['terminado' => true, 'jaqueMate' => rh_ajedrez_rey_en_jaque($tablero, $lado)];
}

/** Material + un bono chico de control central. Valor desde la perspectiva de $lado. */
function rh_ajedrez_heuristica(string $tablero, int $lado): int
{
    $valores = ['P' => 100, 'N' => 300, 'B' => 300, 'R' => 500, 'Q' => 900, 'K' => 0];
    $valor = 0;
    for ($i = 0; $i < RH_AJEDREZ_FILAS * RH_AJEDREZ_COLUMNAS; $i++) {
        $p = $tablero[$i];
        if ($p === '.') {
            continue;
        }
        $l = rh_ajedrez_lado_de($p);
        $peso = $valores[strtoupper($p)];
        $fila = intdiv($i, RH_AJEDREZ_COLUMNAS);
        $col = $i % RH_AJEDREZ_COLUMNAS;
        if ($fila >= 3 && $fila <= 4 && $col >= 3 && $col <= 4) {
            $peso += 10;
        }
        $valor += ($l === $lado) ? $peso : -$peso;
    }
    return $valor;
}

/** Negamax con poda alfa-beta, profundidad chica: rival "de práctica", no de torneo. */
function rh_ajedrez_minimax(string $tablero, int $lado, int $profundidad, int $alfa, int $beta): int
{
    $movimientos = rh_ajedrez_movimientos_legales($tablero, $lado);
    if (empty($movimientos)) {
        if (rh_ajedrez_rey_en_jaque($tablero, $lado)) {
            // Mate: muy negativo para quien mueve ahora, prefiriendo el mate más cercano.
            return -100000 + (RH_AJEDREZ_IA_PROFUNDIDAD - $profundidad);
        }
        return 0; // Ahogado.
    }
    if ($profundidad <= 0) {
        return rh_ajedrez_heuristica($tablero, $lado);
    }

    $mejor = -PHP_INT_MAX;
    foreach ($movimientos as $m) {
        $siguiente = rh_ajedrez_aplicar($tablero, $m);
        $valor = -rh_ajedrez_minimax($siguiente, $lado === 1 ? 2 : 1, $profundidad - 1, -$beta, -$alfa);
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

/** El movimiento que elige la IA para $lado, o null si no tiene ninguno (mate/ahogado). */
function rh_ajedrez_ia_elegir(string $tablero, int $lado, int $profundidad = RH_AJEDREZ_IA_PROFUNDIDAD): ?array
{
    $movimientos = rh_ajedrez_movimientos_legales($tablero, $lado);
    if (empty($movimientos)) {
        return null;
    }

    $mejor = null;
    $mejorValor = -PHP_INT_MAX;
    foreach ($movimientos as $m) {
        $siguiente = rh_ajedrez_aplicar($tablero, $m);
        $valor = -rh_ajedrez_minimax($siguiente, $lado === 1 ? 2 : 1, $profundidad - 1, -PHP_INT_MAX, PHP_INT_MAX);
        if ($valor > $mejorValor) {
            $mejorValor = $valor;
            $mejor = $m;
        }
    }
    return $mejor;
}

/** Puntos que deja una partida de Ajedrez. Mismo criterio que rh_c4_puntos(). */
function rh_ajedrez_puntos(bool $gano, bool $tablas): int
{
    if ($tablas) {
        return 60;
    }
    return $gano ? 120 : 30;
}

/**
 * Resuelve el turno de la IA sobre un tablero dado — no toca la base, sólo
 * calcula. Misma forma que `rh_damas_turno_ia()`: la usan tanto
 * `desafio_crear.php` (si le toca arrancar al bot) como `ajedrez_mover.php`
 * (la respuesta del bot tras la jugada humana).
 *
 * @return array{tablero: string, jugada: ?array, terminoLado: ?int, tablas: bool}
 */
function rh_ajedrez_turno_ia(string $tablero, int $ladoIA): array
{
    $estado = rh_ajedrez_termino($tablero, $ladoIA);
    if ($estado['terminado']) {
        // La IA no tiene movimiento propio: mate (pierde) o ahogado (tablas).
        return [
            'tablero' => $tablero,
            'jugada' => null,
            'terminoLado' => $estado['jaqueMate'] ? $ladoIA : null,
            'tablas' => !$estado['jaqueMate'],
        ];
    }

    $mov = rh_ajedrez_ia_elegir($tablero, $ladoIA);
    $tablero = rh_ajedrez_aplicar($tablero, $mov);

    $rival = $ladoIA === 1 ? 2 : 1;
    $estadoRival = rh_ajedrez_termino($tablero, $rival);
    $terminoLado = null;
    $tablas = false;
    if ($estadoRival['terminado']) {
        if ($estadoRival['jaqueMate']) {
            $terminoLado = $rival;
        } else {
            $tablas = true;
        }
    }

    return ['tablero' => $tablero, 'jugada' => $mov, 'terminoLado' => $terminoLado, 'tablas' => $tablas];
}
