<?php
/**
 * HueRummy: Rummy clásico de descarte, para 2 a 4 jugadores sobre una
 * `JuegoSala` — el cuarto y último juego de la tanda, reusa por completo la
 * infraestructura de salas de HueLudo (`inc/funciones/salas.php`) sin
 * tocarla, mismo patrón exacto que Ludo estableció.
 *
 * Estado en JSON (igual criterio que Ludo: no es una grilla, así que
 * `json_encode`/`json_decode` de un array es más simple que inventar una
 * codificación de caracteres):
 * `{"mazo":[carta,...], "descarte":[carta,...], "manos":[[carta,...],...],
 *   "melds":[{"jugador":0,"cartas":[carta,...]},...], "fase":"robar"|"descartar",
 *   "jugadores":N}`.
 * `carta` es `{"palo":0-3, "valor":1-13}` (as=1, J/Q/K=11/12/13). El mazo se
 * roba por el final (`array_pop`) y el descarte se apila al final también
 * (tope = último elemento) — evita reindexar arrays grandes en cada jugada.
 *
 * **Decisión de alcance** (documentada, mismo criterio que las de Ludo): 7
 * cartas de mano para cualquier cantidad de jugadores (2-4) — el Rummy real
 * varía la mano según cuántos juegan, pero eso no cambia la mecánica y
 * complica el reparto sin sumar nada. Tampoco se puede "bajar" una carta
 * suelta sobre un meld ya jugado (ni propio ni ajeno): cada meld se arma
 * completo desde la mano en un solo pedido y queda fijo en la mesa — jugar
 * cartas sueltas sobre melds existentes es una optimización real de Rummy
 * pero no hace falta para que el juego funcione de punta a punta.
 */

require_once __DIR__ . '/salas.php';

const RH_RUMMY_CARTAS_POR_JUGADOR = 7;

function rh_rummy_mazo_nuevo(): array
{
    $mazo = [];
    for ($palo = 0; $palo < 4; $palo++) {
        for ($valor = 1; $valor <= 13; $valor++) {
            $mazo[] = ['palo' => $palo, 'valor' => $valor];
        }
    }
    return $mazo;
}

function rh_rummy_barajar(array $cartas): array
{
    for ($i = count($cartas) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$cartas[$i], $cartas[$j]] = [$cartas[$j], $cartas[$i]];
    }
    return $cartas;
}

function rh_rummy_inicial(int $jugadores): string
{
    $mazo = rh_rummy_barajar(rh_rummy_mazo_nuevo());

    $manos = [];
    for ($j = 0; $j < $jugadores; $j++) {
        $mano = [];
        for ($c = 0; $c < RH_RUMMY_CARTAS_POR_JUGADOR; $c++) {
            $mano[] = array_pop($mazo);
        }
        $manos[] = $mano;
    }

    $descarte = [array_pop($mazo)];

    return json_encode([
        'mazo' => $mazo,
        'descarte' => $descarte,
        'manos' => $manos,
        'melds' => [],
        'fase' => 'robar',
        'jugadores' => $jugadores,
    ]);
}

/** As=1, 2-10 su número, J/Q/K=10 (valor de "deadwood" clásico de Rummy). */
function rh_rummy_valor_carta(array $carta): int
{
    return min((int) $carta['valor'], 10);
}

function rh_rummy_mismacarta(array $a, array $b): bool
{
    return $a['palo'] === $b['palo'] && $a['valor'] === $b['valor'];
}

/** 3 o 4 cartas de igual valor, palos distintos. */
function rh_rummy_es_set(array $cartas): bool
{
    $n = count($cartas);
    if ($n < 3 || $n > 4) {
        return false;
    }
    $valor = $cartas[0]['valor'];
    $palos = [];
    foreach ($cartas as $c) {
        if ($c['valor'] !== $valor || in_array($c['palo'], $palos, true)) {
            return false;
        }
        $palos[] = $c['palo'];
    }
    return true;
}

/** 3 o más cartas del mismo palo, valores consecutivos (sin vuelta K-A). */
function rh_rummy_es_run(array $cartas): bool
{
    $n = count($cartas);
    if ($n < 3) {
        return false;
    }
    $ordenadas = $cartas;
    usort($ordenadas, fn ($a, $b) => $a['valor'] <=> $b['valor']);
    $palo = $ordenadas[0]['palo'];
    for ($i = 0; $i < $n; $i++) {
        if ($ordenadas[$i]['palo'] !== $palo) {
            return false;
        }
        if ($i > 0 && $ordenadas[$i]['valor'] !== $ordenadas[$i - 1]['valor'] + 1) {
            return false;
        }
    }
    return true;
}

function rh_rummy_es_meld_valido(array $cartas): bool
{
    return rh_rummy_es_set($cartas) || rh_rummy_es_run($cartas);
}

/** Suma de valores de las cartas que le quedan sueltas a un jugador (para la heurística de la IA). */
function rh_rummy_deadwood(array $mano): int
{
    return array_sum(array_map('rh_rummy_valor_carta', $mano));
}

/** ¿Hay de dónde robar? Si no queda mazo y el descarte tiene 1 sola carta (el tope), no hay jugada posible. */
function rh_rummy_puede_robar(array $estado): bool
{
    return count($estado['mazo']) > 0 || count($estado['descarte']) > 1;
}

/**
 * Roba una carta para $jugador, del mazo o del tope del descarte. Si el
 * mazo se queda vacío, se reforma con el descarte (menos su tope, que
 * sigue visible) — regla clásica de Rummy para que la partida no se corte.
 *
 * @return array{estado: array, carta: ?array, error: ?string}
 */
function rh_rummy_robar(array $estado, int $jugador, string $origen): array
{
    if ($estado['fase'] !== 'robar') {
        return ['estado' => $estado, 'carta' => null, 'error' => 'Ya robaste, te falta descartar'];
    }

    if ($origen === 'descarte') {
        if (count($estado['descarte']) === 0) {
            return ['estado' => $estado, 'carta' => null, 'error' => 'No hay descarte de dónde robar'];
        }
        $carta = array_pop($estado['descarte']);
    } else {
        if (count($estado['mazo']) === 0) {
            if (count($estado['descarte']) <= 1) {
                return ['estado' => $estado, 'carta' => null, 'error' => 'No queda nada de dónde robar'];
            }
            $tope = array_pop($estado['descarte']);
            $estado['mazo'] = rh_rummy_barajar($estado['descarte']);
            $estado['descarte'] = [$tope];
        }
        $carta = array_pop($estado['mazo']);
    }

    $estado['manos'][$jugador][] = $carta;
    $estado['fase'] = 'descartar';

    return ['estado' => $estado, 'carta' => $carta, 'error' => null];
}

/**
 * Baja un meld nuevo con cartas de la mano de $jugador, identificadas por
 * índice dentro de esa mano. Se puede llamar varias veces en el mismo turno
 * (bajar más de un meld) mientras la fase siga en 'descartar' (ya robó).
 *
 * @return array{estado: array, error: ?string}
 */
function rh_rummy_bajar_meld(array $estado, int $jugador, array $indices): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'error' => 'Primero tenés que robar'];
    }

    $mano = $estado['manos'][$jugador];
    $indices = array_values(array_unique($indices));
    sort($indices);

    $cartas = [];
    foreach ($indices as $i) {
        if (!isset($mano[$i])) {
            return ['estado' => $estado, 'error' => 'Índice de carta inválido'];
        }
        $cartas[] = $mano[$i];
    }

    if (!rh_rummy_es_meld_valido($cartas)) {
        return ['estado' => $estado, 'error' => 'Esas cartas no forman un juego válido'];
    }

    // Se sacan de la mano de atrás para adelante para no correr los índices ya usados.
    foreach (array_reverse($indices) as $i) {
        array_splice($mano, $i, 1);
    }
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][] = ['jugador' => $jugador, 'cartas' => $cartas];

    return ['estado' => $estado, 'error' => null];
}

/**
 * Descarta una carta de la mano de $jugador y cierra su turno. Si la mano
 * queda vacía, ganó — el caller (el endpoint/sala) es quien cierra la sala.
 *
 * @return array{estado: array, carta: ?array, gano: bool, error: ?string}
 */
function rh_rummy_descartar(array $estado, int $jugador, int $indice): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'carta' => null, 'gano' => false, 'error' => 'Primero tenés que robar'];
    }

    $mano = $estado['manos'][$jugador];
    if (!isset($mano[$indice])) {
        return ['estado' => $estado, 'carta' => null, 'gano' => false, 'error' => 'Índice de carta inválido'];
    }

    $carta = $mano[$indice];
    array_splice($mano, $indice, 1);
    $estado['manos'][$jugador] = $mano;
    $estado['descarte'][] = $carta;
    $estado['fase'] = 'robar';

    return ['estado' => $estado, 'carta' => $carta, 'gano' => count($mano) === 0, 'error' => null];
}

/**
 * Heurística de la IA para elegir qué melds bajar de una mano: primero
 * junta sets (mismo valor), después runs (mismo palo consecutivo) con lo
 * que sobró — orden greedy, no busca la combinación óptima (documentado en
 * el encabezado del archivo).
 *
 * @return array{melds: array[], sueltas: array[]} índices de mano agrupados por meld, y los que quedan sueltos
 */
function rh_rummy_ia_encontrar_melds(array $mano): array
{
    $restantes = array_keys($mano); // índices todavía disponibles
    $melds = [];

    // Sets: agrupar por valor.
    $porValor = [];
    foreach ($restantes as $i) {
        $porValor[$mano[$i]['valor']][] = $i;
    }
    foreach ($porValor as $indicesValor) {
        if (count($indicesValor) >= 3) {
            // Como máximo 4 palos: si hay más de 4 con el mismo valor no puede
            // pasar (mazo de 1 solo palo por valor), así que directo sirve.
            $melds[] = array_slice($indicesValor, 0, 4);
        }
    }
    $usados = [];
    foreach ($melds as $m) {
        $usados = array_merge($usados, $m);
    }
    $restantes = array_values(array_diff($restantes, $usados));

    // Runs: agrupar por palo, ordenar por valor, tomar corridas consecutivas de 3+.
    $porPalo = [];
    foreach ($restantes as $i) {
        $porPalo[$mano[$i]['palo']][] = $i;
    }
    foreach ($porPalo as $indicesPalo) {
        usort($indicesPalo, fn ($a, $b) => $mano[$a]['valor'] <=> $mano[$b]['valor']);
        $corrida = [];
        foreach ($indicesPalo as $k => $i) {
            if ($corrida && $mano[$i]['valor'] !== $mano[end($corrida)]['valor'] + 1) {
                if (count($corrida) >= 3) {
                    $melds[] = $corrida;
                }
                $corrida = [];
            }
            $corrida[] = $i;
        }
        if (count($corrida) >= 3) {
            $melds[] = $corrida;
        }
    }

    $todosUsados = [];
    foreach ($melds as $m) {
        $todosUsados = array_merge($todosUsados, $m);
    }
    $sueltas = array_values(array_diff(array_keys($mano), $todosUsados));

    return ['melds' => $melds, 'sueltas' => $sueltas];
}

/**
 * Juega el turno completo de la IA para $jugador: roba (el descarte si le
 * completa un meld, si no del mazo), baja todos los melds que puede, y
 * descarta la carta suelta de mayor valor.
 *
 * @return array{estado: array, robo: array, melds: array[], descarte: array, gano: bool}
 */
function rh_rummy_turno_ia_completo(array $estado, int $jugador): array
{
    $manoAntes = $estado['manos'][$jugador];
    $tomaDescarte = false;
    if (count($estado['descarte']) > 0) {
        $candidata = end($estado['descarte']);
        $manoConDescarte = $manoAntes;
        $manoConDescarte[] = $candidata;
        $prueba = rh_rummy_ia_encontrar_melds($manoConDescarte);
        if ($prueba['melds']) {
            $tomaDescarte = true;
        }
    }

    $resultado = rh_rummy_robar($estado, $jugador, $tomaDescarte ? 'descarte' : 'mazo');
    $estado = $resultado['estado'];
    $cartaRobada = $resultado['carta'];

    $melds = [];
    while (true) {
        $encontrados = rh_rummy_ia_encontrar_melds($estado['manos'][$jugador]);
        if (!$encontrados['melds']) {
            break;
        }
        $mano = $estado['manos'][$jugador];
        $indices = $encontrados['melds'][0];
        $cartasDelMeld = array_map(fn ($i) => $mano[$i], $indices);
        $r = rh_rummy_bajar_meld($estado, $jugador, $indices);
        if ($r['error'] !== null) {
            break; // no debería pasar, pero corta el loop en vez de colgarse
        }
        $estado = $r['estado'];
        $melds[] = $cartasDelMeld;
    }

    $mano = $estado['manos'][$jugador];
    if (count($mano) === 0) {
        // Se quedó sin cartas bajando melds — no hace falta descartar, ya ganó.
        return ['estado' => $estado, 'robo' => $cartaRobada, 'melds' => $melds, 'descarte' => null, 'gano' => true];
    }

    // Descarta la de mayor valor entre las que le quedaron sueltas.
    $peorIndice = 0;
    $peorValor = -1;
    foreach ($mano as $i => $c) {
        $v = rh_rummy_valor_carta($c);
        if ($v > $peorValor) {
            $peorValor = $v;
            $peorIndice = $i;
        }
    }
    $cartaDescartada = $mano[$peorIndice];
    $rd = rh_rummy_descartar($estado, $jugador, $peorIndice);
    $estado = $rd['estado'];

    return ['estado' => $estado, 'robo' => $cartaRobada, 'melds' => $melds, 'descarte' => $cartaDescartada, 'gano' => $rd['gano']];
}

/**
 * Vista del estado segura para mandar al cliente que mira desde
 * `$miPosicion`: mi mano completa, sólo la CANTIDAD de cartas de cada
 * rival (nunca cuáles), el mazo como número (nunca las cartas, arruinaría
 * el robo), y lo que ya es información pública (descarte, melds en la
 * mesa, fase, cuántos jugadores). El `Tablero` crudo de la sala JAMÁS se
 * manda tal cual al cliente en HueRummy — a diferencia de Ludo, acá tiene
 * las manos de todos.
 */
function rh_rummy_estado_visible(array $estado, int $miPosicion): array
{
    $cantidadPorJugador = [];
    foreach ($estado['manos'] as $posicion => $mano) {
        $cantidadPorJugador[$posicion] = count($mano);
    }

    return [
        'miMano' => $estado['manos'][$miPosicion] ?? [],
        'cantidadCartasPorJugador' => $cantidadPorJugador,
        'cartasEnMazo' => count($estado['mazo']),
        'descarte' => $estado['descarte'],
        'melds' => $estado['melds'],
        'fase' => $estado['fase'],
        'jugadores' => $estado['jugadores'],
    ];
}

/** Puntos que deja una partida de Rummy. Mismo criterio fijo que rh_ludo_puntos(). */
function rh_rummy_puntos(bool $gano): int
{
    return $gano ? 150 : 40;
}

/**
 * Mientras a quien le toca jugar sea un asiento controlado por IA (el bot
 * desde el arranque, o un humano cuyo asiento tomó la IA tras vencer su
 * turno), le juega su turno completo y pasa al siguiente — mismo patrón que
 * `rh_ludo_sala_resolver_ia_en_cadena()`. A diferencia de Ludo, acá un turno
 * de IA es siempre uno solo (no hay "sacar 6 y tirar de nuevo").
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_rummy_sala_resolver_ia_en_cadena(mysqli $conn, array $sala, array $jugadores): array
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
        $posicion = (int) $actual['Posicion'];

        if (!rh_rummy_puede_robar($estado)) {
            // No hay de dónde robar: se corta la ronda, gana quien tenga menos deadwood.
            $ganador = rh_rummy_ganador_por_deadwood($estado, $jugadores);
            $puntos = [];
            foreach ($jugadores as $j) {
                $puntos[(int) $j['SalaJugadorId']] = rh_rummy_puntos($ganador !== null && (int) $j['SalaJugadorId'] === $ganador);
            }
            rh_sala_cerrar($conn, $sala, $jugadores, $ganador, $puntos);
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $resultado = rh_rummy_turno_ia_completo($estado, $posicion);
        $tableroJson = json_encode($resultado['estado']);
        $jugadasIA[] = [
            'salaJugadorId' => (int) $actual['SalaJugadorId'],
            'robo' => $resultado['robo'],
            'melds' => $resultado['melds'],
            'descarte' => $resultado['descarte'],
        ];

        $stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
        $stmt->bind_param('si', $tableroJson, $salaId);
        $stmt->execute();
        $stmt->close();

        if ($resultado['gano']) {
            $puntos = [];
            foreach ($jugadores as $j) {
                $puntos[(int) $j['SalaJugadorId']] = rh_rummy_puntos((int) $j['SalaJugadorId'] === (int) $actual['SalaJugadorId']);
            }
            rh_sala_cerrar($conn, $sala, $jugadores, (int) $actual['SalaJugadorId'], $puntos);
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
        $siguiente = rh_sala_siguiente_jugador($activos, $posicion);
        if ($siguiente !== null) {
            rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoHoras']);
        }

        $sala = rh_sala_obtener($conn, $salaId);
    }

    return ['sala' => $sala, 'jugadores' => rh_sala_jugadores($conn, $salaId), 'jugadasIA' => $jugadasIA];
}

/** El SalaJugadorId con menos deadwood entre los asientos activos, o null si hay empate. */
function rh_rummy_ganador_por_deadwood(array $estado, array $jugadores): ?int
{
    $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
    $mejorId = null;
    $mejorValor = null;
    $empate = false;
    foreach ($activos as $j) {
        $posicion = (int) $j['Posicion'];
        $valor = rh_rummy_deadwood($estado['manos'][$posicion] ?? []);
        if ($mejorValor === null || $valor < $mejorValor) {
            $mejorValor = $valor;
            $mejorId = (int) $j['SalaJugadorId'];
            $empate = false;
        } elseif ($valor === $mejorValor) {
            $empate = true;
        }
    }
    return $empate ? null : $mejorId;
}

/**
 * Punto de entrada único para dejar una sala de Rummy al día antes de
 * mostrarla o de jugar: resuelve el turno vencido si lo hay y encadena los
 * turnos de IA que correspondan. Espejo de `rh_ludo_sala_actualizar()`.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_rummy_sala_actualizar(mysqli $conn, array $sala): array
{
    $salaId = (int) $sala['SalaId'];

    if ($sala['Estado'] === 'jugando' && $sala['TurnoVenceEn'] !== null && strtotime($sala['TurnoVenceEn']) <= time()) {
        rh_sala_resolver_turno_vencido($conn, $sala);
        // A diferencia de Ludo, la política 'expulsa' en Rummy no necesita
        // tocar el tablero: las cartas de quien se va simplemente quedan
        // congeladas en su mano, no hay "fichas en juego" que sacar.
        $sala = rh_sala_obtener($conn, $salaId);
    }

    $jugadores = rh_sala_jugadores($conn, $salaId);
    if ($sala['Estado'] !== 'jugando') {
        return ['sala' => $sala, 'jugadores' => $jugadores, 'jugadasIA' => []];
    }

    return rh_rummy_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
}
