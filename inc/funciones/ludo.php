<?php
/**
 * HueLudo: el Ludo de HuePlay, para 2 a 4 jugadores sobre una `JuegoSala`.
 *
 * A diferencia de Damas/Ajedrez (un string de casillas de una grilla
 * cuadrada), acá el tablero se guarda como **JSON**: Ludo no es una grilla,
 * es un camino en cruz + 4 corrales + 4 tramos finales privados, así que
 * inventar una codificación de caracteres sería más lío que
 * `json_decode`/`json_encode` de un array de 16 fichas.
 *
 * Cada ficha guarda su posición RELATIVA al camino de SU jugador, no la
 * posición absoluta en el anillo compartido: `-1` corral, `0-50` las 51
 * casillas del camino compartido (0 = su propia casilla de entrada, y da
 * casi toda la vuelta al anillo de 52 antes de doblar hacia su tramo final),
 * `51-56` su tramo final privado (6 casillas), `57` la meta/home. Guardar la
 * posición relativa evita tener que restar el offset de entrada en cada
 * cálculo de movimiento — sólo hace falta convertir a absoluta para saber si
 * hay captura contra un rival en el camino compartido.
 *
 * El estado también guarda `consecutivosSeis` (3 seises seguidos sin haber
 * completado un movimiento de verdad hacen perder el turno, regla clásica
 * para evitar que alguien se quede tirando para siempre) y `dadoPendiente`
 * (el valor que se tiró y todavía no se jugó — hacen falta 2 requests,
 * primero tirar y después elegir con qué ficha, así que ese número tiene que
 * sobrevivir entre uno y otro).
 */

require_once __DIR__ . '/salas.php';

const RH_LUDO_CAMINO = 52;
const RH_LUDO_HOME = 57;
const RH_LUDO_ENTRADA_POR_JUGADOR = 13;

function rh_ludo_inicial(int $jugadores): string
{
    $fichas = [];
    for ($j = 0; $j < $jugadores; $j++) {
        for ($n = 0; $n < 4; $n++) {
            $fichas[] = ['jugador' => $j, 'num' => $n, 'pos' => -1];
        }
    }
    return json_encode(['fichas' => $fichas, 'consecutivosSeis' => 0, 'dadoPendiente' => null, 'jugadores' => $jugadores]);
}

function rh_ludo_tirar(): int
{
    return random_int(1, 6);
}

/** null si la ficha está en el corral o ya en su tramo final/home (privado, sin captura posible ahí). */
function rh_ludo_posicion_absoluta(int $jugador, int $posRelativa): ?int
{
    if ($posRelativa < 0 || $posRelativa > 50) {
        return null;
    }
    return ($jugador * RH_LUDO_ENTRADA_POR_JUGADOR + $posRelativa) % RH_LUDO_CAMINO;
}

/** Las 4 entradas + las 4 "estrella" (8 casillas después de cada entrada) — convención clásica del Ludo. */
function rh_ludo_es_casilla_segura(int $posicionAbsoluta): bool
{
    for ($j = 0; $j < 4; $j++) {
        $entrada = $j * RH_LUDO_ENTRADA_POR_JUGADOR;
        if ($posicionAbsoluta === $entrada || $posicionAbsoluta === ($entrada + 8) % RH_LUDO_CAMINO) {
            return true;
        }
    }
    return false;
}

/** Las fichas (de cualquier jugador) paradas en una posición absoluta del camino compartido. */
function rh_ludo_fichas_en(array $estado, int $posicionAbsoluta): array
{
    $enEsa = [];
    foreach ($estado['fichas'] as $f) {
        $abs = rh_ludo_posicion_absoluta($f['jugador'], $f['pos']);
        if ($abs === $posicionAbsoluta) {
            $enEsa[] = $f;
        }
    }
    return $enEsa;
}

/** ¿Aterrizar $jugador en su posición relativa $posRelativa capturaría a algún rival? */
function rh_ludo_hay_captura(array $estado, int $jugador, int $posRelativa): bool
{
    $abs = rh_ludo_posicion_absoluta($jugador, $posRelativa);
    if ($abs === null || rh_ludo_es_casilla_segura($abs)) {
        return false;
    }
    foreach (rh_ludo_fichas_en($estado, $abs) as $f) {
        if ($f['jugador'] !== $jugador) {
            return true;
        }
    }
    return false;
}

/**
 * Movimientos legales de $jugador con el valor $dado ya tirado.
 *
 * @return array<int, array{ficha: array, desde: int, hasta: int, captura: bool}>
 */
function rh_ludo_movimientos_legales(array $estado, int $jugador, int $dado): array
{
    $movs = [];
    foreach ($estado['fichas'] as $f) {
        if ($f['jugador'] !== $jugador) {
            continue;
        }

        if ($f['pos'] === -1) {
            if ($dado === 6) {
                $movs[] = ['ficha' => $f, 'desde' => -1, 'hasta' => 0, 'captura' => rh_ludo_hay_captura($estado, $jugador, 0)];
            }
            continue;
        }

        $hasta = $f['pos'] + $dado;
        if ($hasta > RH_LUDO_HOME) {
            continue; // hace falta el número justo para entrar a la meta, no se pasa de largo
        }
        $movs[] = ['ficha' => $f, 'desde' => $f['pos'], 'hasta' => $hasta, 'captura' => rh_ludo_hay_captura($estado, $jugador, $hasta)];
    }
    return $movs;
}

/**
 * Aplica un movimiento YA VALIDADO. Las fichas rivales capturadas vuelven al
 * corral (pos=-1) — nunca en el tramo final o casillas seguras, eso ya lo
 * filtra `rh_ludo_hay_captura()` al generar los legales.
 *
 * @return array{estado: array, capturadas: array}
 */
function rh_ludo_aplicar(array $estado, array $movimiento): array
{
    $jugador = $movimiento['ficha']['jugador'];
    $num = $movimiento['ficha']['num'];
    $hasta = $movimiento['hasta'];
    $capturadas = [];

    if ($movimiento['captura']) {
        $abs = rh_ludo_posicion_absoluta($jugador, $hasta);
        foreach ($estado['fichas'] as &$f) {
            if ($f['jugador'] !== $jugador && rh_ludo_posicion_absoluta($f['jugador'], $f['pos']) === $abs) {
                $f['pos'] = -1;
                $capturadas[] = ['jugador' => $f['jugador'], 'num' => $f['num']];
            }
        }
        unset($f);
    }

    foreach ($estado['fichas'] as &$f) {
        if ($f['jugador'] === $jugador && $f['num'] === $num) {
            $f['pos'] = $hasta;
            break;
        }
    }
    unset($f);

    return ['estado' => $estado, 'capturadas' => $capturadas];
}

/** Sus 4 fichas en la meta. */
function rh_ludo_gano(array $estado, int $jugador): bool
{
    foreach ($estado['fichas'] as $f) {
        if ($f['jugador'] === $jugador && $f['pos'] !== RH_LUDO_HOME) {
            return false;
        }
    }
    return true;
}

/** Saca del tablero a un jugador expulsado: sus fichas vuelven al corral, no vuelve a tener turno. */
function rh_ludo_sacar_jugador(array $estado, int $jugador): array
{
    foreach ($estado['fichas'] as &$f) {
        if ($f['jugador'] === $jugador) {
            $f['pos'] = -1;
        }
    }
    unset($f);
    return $estado;
}

/**
 * Tira el dado y calcula qué se puede jugar con ese valor. Si no hay ninguna
 * jugada posible (todas las fichas en el corral y no salió 6) o se perdió el
 * turno por 3 seises seguidos, `movimientosLegales` viene vacío y el caller
 * tiene que pasar el turno sin aplicar nada.
 *
 * @return array{estado: array, dado: int, movimientosLegales: array, perdioPorTresSeises: bool}
 */
function rh_ludo_tirar_y_calcular(array $estado, int $jugador): array
{
    $dado = rh_ludo_tirar();
    $consecutivos = ($estado['consecutivosSeis'] ?? 0) + ($dado === 6 ? 1 : -($estado['consecutivosSeis'] ?? 0));
    // (equivalente a: si es 6, sumar 1; si no, resetear a 0 — escrito así para no repetir la lectura del array dos veces)
    $consecutivos = $dado === 6 ? (($estado['consecutivosSeis'] ?? 0) + 1) : 0;

    $perdioPorTresSeises = $consecutivos >= 3;
    if ($perdioPorTresSeises) {
        $consecutivos = 0;
    }

    $legales = $perdioPorTresSeises ? [] : rh_ludo_movimientos_legales($estado, $jugador, $dado);

    $estado['consecutivosSeis'] = $consecutivos;
    $estado['dadoPendiente'] = empty($legales) ? null : $dado;

    return ['estado' => $estado, 'dado' => $dado, 'movimientosLegales' => $legales, 'perdioPorTresSeises' => $perdioPorTresSeises];
}

/** Heurística simple: capturar > sacar del corral > la ficha más avanzada. */
function rh_ludo_ia_elegir(array $movimientosLegales): array
{
    $elegidos = $movimientosLegales;
    usort($elegidos, function (array $a, array $b): int {
        if ($a['captura'] !== $b['captura']) {
            return $b['captura'] <=> $a['captura'];
        }
        $aSaca = $a['desde'] === -1;
        $bSaca = $b['desde'] === -1;
        if ($aSaca !== $bSaca) {
            return $bSaca <=> $aSaca;
        }
        return $b['hasta'] <=> $a['hasta'];
    });
    return $elegidos[0];
}

/**
 * Juega el turno completo de la IA para $jugador — puede ser más de una
 * tirada si saca seises, hasta que el turno pase de verdad o gane.
 *
 * @return array{estado: array, jugadas: array[], gano: bool}
 */
function rh_ludo_turno_ia_completo(array $estado, int $jugador): array
{
    $jugadas = [];

    while (true) {
        $resultado = rh_ludo_tirar_y_calcular($estado, $jugador);
        $estado = $resultado['estado'];

        if (empty($resultado['movimientosLegales'])) {
            $jugadas[] = ['dado' => $resultado['dado'], 'ficha' => null, 'desde' => null, 'hasta' => null, 'capturadas' => []];
            break;
        }

        $elegido = rh_ludo_ia_elegir($resultado['movimientosLegales']);
        $aplicado = rh_ludo_aplicar($estado, $elegido);
        $estado = $aplicado['estado'];
        $estado['dadoPendiente'] = null;

        $jugadas[] = [
            'dado' => $resultado['dado'],
            'ficha' => ['jugador' => $elegido['ficha']['jugador'], 'num' => $elegido['ficha']['num']],
            'desde' => $elegido['desde'],
            'hasta' => $elegido['hasta'],
            'capturadas' => $aplicado['capturadas'],
        ];

        if (rh_ludo_gano($estado, $jugador)) {
            return ['estado' => $estado, 'jugadas' => $jugadas, 'gano' => true];
        }

        if ($resultado['dado'] !== 6) {
            break;
        }
    }

    return ['estado' => $estado, 'jugadas' => $jugadas, 'gano' => false];
}

/** Puntos que deja una partida de Ludo. Mismo criterio que rh_c4_puntos(). */
function rh_ludo_puntos(bool $gano): int
{
    return $gano ? 150 : 40;
}

/**
 * Mientras a quien le toca jugar en la sala sea un asiento controlado por
 * IA (el bot desde el arranque, o un humano cuyo asiento tomó la IA tras
 * vencer su turno), le juega su turno completo y pasa al siguiente — hasta
 * que le toque a un humano de verdad o la partida termine. El bot nunca
 * hace esperar a nadie, mismo criterio que en los duelos 1 contra 1.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_ludo_sala_resolver_ia_en_cadena(mysqli $conn, array $sala, array $jugadores): array
{
    $jugadasIA = [];
    $salaId = (int) $sala['SalaId'];

    while ($sala['Estado'] === 'jugando' && $sala['TurnoDeSalaJugadorId'] !== null) {
        $actual = null;
        foreach ($jugadores as $j) {
            if ((int) $j['SalaJugadorId'] === (int) $sala['TurnoDeSalaJugadorId']) {
                $actual = $j;
                break;
            }
        }
        if (!$actual) {
            break;
        }

        $esIA = rh_juego_es_bot($conn, (int) $actual['UserId']) || (bool) $actual['TomadoPorIA'];
        if (!$esIA) {
            break;
        }

        $estado = json_decode($sala['Tablero'], true);
        $resultado = rh_ludo_turno_ia_completo($estado, (int) $actual['Posicion']);
        $tableroJson = json_encode($resultado['estado']);
        $jugadasIA[] = ['salaJugadorId' => (int) $actual['SalaJugadorId'], 'jugadas' => $resultado['jugadas']];

        $stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
        $stmt->bind_param('si', $tableroJson, $salaId);
        $stmt->execute();
        $stmt->close();

        if ($resultado['gano']) {
            $puntos = [];
            foreach ($jugadores as $j) {
                $puntos[(int) $j['SalaJugadorId']] = rh_ludo_puntos((int) $j['SalaJugadorId'] === (int) $actual['SalaJugadorId']);
            }
            rh_sala_cerrar($conn, $sala, $jugadores, (int) $actual['SalaJugadorId'], $puntos);
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
        $siguiente = rh_sala_siguiente_jugador($activos, (int) $actual['Posicion']);
        if ($siguiente !== null) {
            rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoMinutos']);
        }

        $sala = rh_sala_obtener($conn, $salaId);
    }

    return ['sala' => $sala, 'jugadores' => rh_sala_jugadores($conn, $salaId), 'jugadasIA' => $jugadasIA];
}

/**
 * Punto de entrada único para dejar una sala de Ludo al día antes de
 * mostrarla o de jugar: resuelve el turno vencido si lo hay (según la
 * política de la sala) y encadena los turnos de IA que correspondan.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_ludo_sala_actualizar(mysqli $conn, array $sala): array
{
    $salaId = (int) $sala['SalaId'];

    if ($sala['Estado'] === 'jugando' && $sala['TurnoVenceEn'] !== null && strtotime($sala['TurnoVenceEn']) <= time()) {
        $resultado = rh_sala_resolver_turno_vencido($conn, $sala);
        if ($resultado['politica'] === 'expulsa' && !$resultado['cerrada']) {
            $sala = rh_sala_obtener($conn, $salaId);
            $estado = json_decode($sala['Tablero'], true);
            $estado = rh_ludo_sacar_jugador($estado, (int) $resultado['salaJugadorAfectado']['Posicion']);
            $tableroJson = json_encode($estado);
            $stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
            $stmt->bind_param('si', $tableroJson, $salaId);
            $stmt->execute();
            $stmt->close();
        }
        $sala = rh_sala_obtener($conn, $salaId);
    }

    $jugadores = rh_sala_jugadores($conn, $salaId);
    if ($sala['Estado'] !== 'jugando') {
        return ['sala' => $sala, 'jugadores' => $jugadores, 'jugadasIA' => []];
    }

    return rh_ludo_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
}
