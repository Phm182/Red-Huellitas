<?php
/**
 * HueLudo Real: la variante de 2 dados (numérico + símbolos) pedida por el
 * usuario, con las reglas físicas de "Royal Ludo" que pegó. Mismo esquema
 * de tablero y posiciones que `ludo.php` (JSON, posición RELATIVA al camino
 * de cada jugador) — de hecho reutiliza sus funciones de posición/captura
 * sin cambios (`rh_ludo_posicion_absoluta`, `rh_ludo_es_casilla_segura`,
 * `rh_ludo_fichas_en`, `rh_ludo_hay_captura`, `rh_ludo_gano`,
 * `rh_ludo_sacar_jugador`). Lo que cambia de verdad es CÓMO se sale del
 * corral y qué hace cada dado — por eso es un archivo aparte y no un flag
 * dentro de `ludo.php`: las reglas de tirada son distintas de punta a punta.
 *
 * **Decisiones de alcance ya tomadas, no reabrir** (el enunciado pegado deja
 * varias cosas a "regla de la casa" — acá quedan fijas):
 *
 * - Dado de símbolos: 6 caras, 2 Corona + 2 Pluma + 2 en blanco (ni corona
 *   ni pluma ese tiro). No es un dado numérico aparte: el ÚNICO valor
 *   numérico de la tirada sigue siendo el dado clásico de siempre.
 * - Salida: en vez del 6 clásico, hace falta Corona en el dado de símbolos.
 *   Al salir, esa ficha ya recorre en el mismo turno los casilleros del
 *   dado numérico (tal cual el ejemplo del enunciado: "corona y un 5, sale
 *   y avanza 5").
 * - Pluma: dos efectos, los dos simultáneos, no uno u otro.
 *   1. Turno extra (vuelve a tirar) — la interpretación elegida de "activa
 *      tu inmunidad o repetir tiro según la regla de la casa".
 *   2. Casillas seguras: se reutilizan las mismas 8 casillas
 *      "estrella"/entrada de siempre (`rh_ludo_es_casilla_segura()`), acá
 *      reinterpretadas como las casillas con Pluma/Corona dibujada del
 *      enunciado — es la misma mecánica de refugio, no hace falta
 *      geometría nueva.
 * - Turno extra también con Corona (cualquier símbolo, no sólo Pluma) o con
 *   un 6 en el dado numérico — mismo criterio "doble o símbolo especial
 *   conserva el turno" del enunciado, adaptado a que acá no hay dos dados
 *   numéricos con los que sacar un doble real.
 * - Barrera: 2+ fichas propias en la misma casilla del camino compartido
 *   son infranqueables PARA ATERRIZAR — ningún rival puede terminar un
 *   movimiento ahí (no se simula "salto por encima" casilla a casilla en
 *   tránsito: el Ludo clásico tampoco lo hace, sólo importa dónde termina
 *   cada tirada).
 * - "Dividir el tiro" entre dos fichas: el enunciado pegado describe la
 *   versión de Royal Ludo con DOS dados numéricos (repartir cada dado a una
 *   ficha distinta, o sumarlos en una sola). Acá el diseño usa un solo dado
 *   numérico + un dado de símbolos (ver arriba), así que no hay dos valores
 *   numéricos para repartir — esta mecánica NO se implementa, es una
 *   consecuencia directa de la decisión de diseño anterior, no un
 *   descuido. El resto de las reglas (turno extra, barreras, casillas
 *   seguras, llegada exacta) sí quedan todas.
 * - Sin fichas afuera y sin Corona: no hay jugada posible, pasa el turno —
 *   igual que el clásico sin 6.
 *
 * **Revisión 2026-09-12** (reglamento real de Ruibal, pegado por el
 * usuario — hasta acá era una versión "regla de la casa" bastante
 * distinta, de ahí las quejas de que no se parecía al juego físico):
 *
 * - Corona/Pluma en el camino compartido (no sólo para salir del corral):
 *   la ficha NO avanza sólo lo que marca el dado numérico — salta hasta la
 *   próxima "Corona" adelante en su camino y RECIÉN AHÍ suma el numérico
 *   (`rh_ludoroyal_proxima_corona()`). Antes esto no existía: cualquier
 *   símbolo sólo daba turno extra y el numérico avanzaba desde donde ya
 *   estaba, sin el salto.
 * - Los 8 checkpoints de Corona son universales (offset 0 y 8 dentro de
 *   cada bloque de 13 casillas) — se reutiliza la misma idea que ya tenía
 *   este archivo para las casillas seguras, porque el reglamento da por
 *   sabida la geometría del tablero impreso y no la escribe en números.
 * - Corona además "barre" rivales: cualquier ficha rival que la jugada
 *   sobrepase entre la posición de salida y la Corona de llegada retrocede
 *   a SU checkpoint anterior (`rh_ludoroyal_en_tramo()` +
 *   `rh_ludoroyal_corona_anterior()`). Pluma hace el mismo salto pero sin
 *   barrer a nadie — tal cual la letra del reglamento ("se realiza el
 *   mismo procedimiento pero los demás jugadores no deben retroceder").
 * - Turno extra: SÓLO Corona (regla 2 del reglamento dice "si el jugador
 *   obtiene NUEVAMENTE Corona, puede repetir la operación" — no menciona
 *   Pluma). Antes cualquier símbolo Y un 6 en el numérico daban turno
 *   extra (66%+ de las tiradas), lo que explica las rachas de "10 turnos
 *   seguidos" reportadas: con esto baja a 2/6 tiradas (33%).
 * - Llegada exacta al tramo final (regla 7): si se pasa, ahora REBOTA
 *   (retrocede lo que se pasó) en vez de simplemente no ofrecer la jugada
 *   — antes una tirada que pasaba de largo quedaba sin ningún movimiento
 *   legal para esa ficha, lo cual no es lo que dice el reglamento.
 * - Sigue sin implementarse (fuera de alcance, documentado): "situarse
 *   sobre" un peón propio para viajar junto a él (regla 4) y la captura por
 *   doble-1 con dos dados numéricos (regla 5) — esta última no aplica
 *   directo porque acá hay UN dado numérico + un dado de símbolos, no dos
 *   numéricos como en la variante de 2 dados que describe esa regla.
 */

require_once __DIR__ . '/ludo.php';
require_once __DIR__ . '/salas.php';

const RH_LUDOROYAL_SIMBOLOS = ['corona', 'corona', 'pluma', 'pluma', 'vacio', 'vacio'];

/** Los 8 checkpoints de "Corona" del camino compartido, en posición
 * RELATIVA (0-50) — universales para cualquier jugador: el patrón de 13
 * casillas por jugador se repite igual para los 4, así que el offset
 * dentro de cada bloque (0 y 8) da siempre el mismo conjunto sin importar
 * de qué jugador se trate. Mismas casillas que ya usaba este archivo como
 * "seguras" (`rh_ludo_es_casilla_segura`, heredada de `ludo.php`). */
const RH_LUDOROYAL_CORONAS_REL = [0, 8, 13, 21, 26, 34, 39, 47];

/** El próximo checkpoint de Corona ESTRICTAMENTE más adelante que
 * `$posRel` en el camino compartido, o `null` si ya no queda ninguno antes
 * de doblar hacia el tramo final (últimas casillas antes de la 51). */
function rh_ludoroyal_proxima_corona(int $posRel): ?int
{
    foreach (RH_LUDOROYAL_CORONAS_REL as $c) {
        if ($c > $posRel) {
            return $c;
        }
    }
    return null;
}

/** El checkpoint de Corona en o inmediatamente antes de `$posRel` — a
 * dónde retrocede un rival "barrido" por una jugada de Corona. */
function rh_ludoroyal_corona_anterior(int $posRel): int
{
    $anterior = 0;
    foreach (RH_LUDOROYAL_CORONAS_REL as $c) {
        if ($c > $posRel) {
            break;
        }
        $anterior = $c;
    }
    return $anterior;
}

/** ¿La posición absoluta `$pos` cae en el tramo circular `(desde, hasta]`
 * del camino compartido de 52 casillas? Circular porque el camino da toda
 * la vuelta al anillo antes de que cada jugador doble a su tramo final. */
function rh_ludoroyal_en_tramo(int $desde, int $hasta, int $pos): bool
{
    if ($desde <= $hasta) {
        return $pos > $desde && $pos <= $hasta;
    }
    return $pos > $desde || $pos <= $hasta;
}

/** Sólo Corona da turno extra — ver la nota de revisión de arriba. Función
 * compartida a propósito: antes `ludoroyal_mover.php` reimplementaba esta
 * cuenta por su lado (`$dado === 6 || $simbolo !== 'vacio'`) separada de
 * la de este archivo, y las dos podían desincronizarse. */
function rh_ludoroyal_da_turno_extra(string $simbolo): bool
{
    return $simbolo === 'corona';
}

function rh_ludoroyal_inicial(int $jugadores): string
{
    $fichas = [];
    for ($j = 0; $j < $jugadores; $j++) {
        for ($n = 0; $n < 4; $n++) {
            $fichas[] = ['jugador' => $j, 'num' => $n, 'pos' => -1];
        }
    }
    return json_encode(['fichas' => $fichas, 'jugadores' => $jugadores, 'dadoPendiente' => null, 'simboloPendiente' => null]);
}

function rh_ludoroyal_tirar_numerico(): int
{
    return random_int(1, 6);
}

function rh_ludoroyal_tirar_simbolo(): string
{
    return RH_LUDOROYAL_SIMBOLOS[random_int(0, 5)];
}

/**
 * ¿Aterrizar $jugador en $posRelativa chocaría con una BARRERA rival (2+
 * fichas del mismo rival ya paradas ahí)? Una barrera no se puede ni
 * capturar ni ocupar.
 */
function rh_ludoroyal_hay_barrera_rival(array $estado, int $jugador, int $posRelativa): bool
{
    $abs = rh_ludo_posicion_absoluta($jugador, $posRelativa);
    if ($abs === null) {
        return false;
    }
    $porJugador = [];
    foreach (rh_ludo_fichas_en($estado, $abs) as $f) {
        if ($f['jugador'] !== $jugador) {
            $porJugador[$f['jugador']] = ($porJugador[$f['jugador']] ?? 0) + 1;
        }
    }
    foreach ($porJugador as $cantidad) {
        if ($cantidad >= 2) {
            return true;
        }
    }
    return false;
}

/** Arma una entrada de `movimientosLegales` con la forma que espera el
 * resto del archivo (y `ludoroyal_mover.php`, que sólo lee `ficha`/`desde`/
 * `hasta`/`captura`) más los datos extra del salto de Corona/Pluma, si los
 * hay, para que `rh_ludoroyal_aplicar()` pueda barrer rivales después. */
function rh_ludoroyal_armar_movimiento(array $f, int $desde, int $hasta, array $estado, int $jugador, bool $esCorona, ?int $saltoDesde = null, ?int $saltoHasta = null): array
{
    return [
        'ficha' => $f,
        'desde' => $desde,
        'hasta' => $hasta,
        'captura' => rh_ludo_hay_captura($estado, $jugador, $hasta),
        'corona' => $esCorona,
        'saltoDesde' => $saltoDesde,
        'saltoHasta' => $saltoHasta,
    ];
}

/**
 * Movimientos legales con los dos dados ya tirados. La salida del corral
 * sigue necesitando Corona (en vez de un 6) y la ficha que sale avanza de
 * una el numérico desde la Corona de salida (regla 1: "corona y un 5→sale
 * y avanza 5"). En el camino compartido, Corona/Pluma saltan hasta la
 * próxima Corona adelante y RECIÉN AHÍ suman el numérico (regla 3) — ver
 * la nota de revisión arriba del archivo. En el tramo final privado
 * (51-56) no hay checkpoints ni rivales: sólo llegada exacta, con rebote
 * si se pasa (regla 7).
 */
function rh_ludoroyal_movimientos_legales(array $estado, int $jugador, int $dado, string $simbolo): array
{
    $movs = [];
    foreach ($estado['fichas'] as $f) {
        if ($f['jugador'] !== $jugador) {
            continue;
        }

        if ($f['pos'] === -1) {
            if ($simbolo === 'corona') {
                $hasta = min($dado, RH_LUDO_HOME);
                if (!rh_ludoroyal_hay_barrera_rival($estado, $jugador, $hasta)) {
                    $movs[] = rh_ludoroyal_armar_movimiento($f, -1, $hasta, $estado, $jugador, false);
                }
            }
            continue;
        }

        if ($f['pos'] >= 51) {
            $destino = $f['pos'] + $dado;
            if ($destino > RH_LUDO_HOME) {
                $destino = RH_LUDO_HOME - ($destino - RH_LUDO_HOME);
            }
            if ($destino >= 51) {
                $movs[] = rh_ludoroyal_armar_movimiento($f, $f['pos'], $destino, $estado, $jugador, false);
            }
            continue;
        }

        $proxima = $simbolo !== 'vacio' ? rh_ludoroyal_proxima_corona($f['pos']) : null;
        if ($proxima !== null) {
            $destino = $proxima + $dado; // máximo 47+6=53: nunca se pasa de 57 acá.
            if (!rh_ludoroyal_hay_barrera_rival($estado, $jugador, $destino)) {
                $movs[] = rh_ludoroyal_armar_movimiento(
                    $f, $f['pos'], $destino, $estado, $jugador,
                    $simbolo === 'corona', $f['pos'], $proxima
                );
            }
            continue;
        }

        $hasta = $f['pos'] + $dado;
        if ($hasta > RH_LUDO_HOME) {
            continue;
        }
        if (rh_ludoroyal_hay_barrera_rival($estado, $jugador, $hasta)) {
            continue;
        }
        $movs[] = rh_ludoroyal_armar_movimiento($f, $f['pos'], $hasta, $estado, $jugador, false);
    }
    return $movs;
}

/**
 * Aplica un movimiento ya validado. La captura en la casilla de LLEGADA es
 * el mismo mecanismo del clásico (`rh_ludo_aplicar`). Si además fue un
 * salto de Corona, "barre" a cualquier rival que haya quedado en el tramo
 * saltado (entre la salida y la Corona, sin contar la llegada final, que
 * ya la resuelve la captura normal): esos rivales retroceden a su propio
 * checkpoint anterior — la interpretación de "los demás jugadores deben
 * retroceder un peón a la Corona inmediata inferior" del reglamento.
 */
function rh_ludoroyal_aplicar(array $estado, array $movimiento): array
{
    $resultado = rh_ludo_aplicar($estado, $movimiento);
    $estado = $resultado['estado'];

    if (!empty($movimiento['corona']) && isset($movimiento['saltoDesde'], $movimiento['saltoHasta'])) {
        $jugadorQueSalta = $movimiento['ficha']['jugador'];
        $desdeAbs = rh_ludo_posicion_absoluta($jugadorQueSalta, $movimiento['saltoDesde']);
        $hastaAbs = rh_ludo_posicion_absoluta($jugadorQueSalta, $movimiento['saltoHasta']);

        if ($desdeAbs !== null && $hastaAbs !== null) {
            foreach ($estado['fichas'] as &$f) {
                if ($f['jugador'] === $jugadorQueSalta || $f['pos'] < 0 || $f['pos'] > 50) {
                    continue; // rival en el corral o en su propio tramo final: no lo alcanza la barrida
                }
                $abs = rh_ludo_posicion_absoluta($f['jugador'], $f['pos']);
                if ($abs === null || !rh_ludoroyal_en_tramo($desdeAbs, $hastaAbs, $abs)) {
                    continue;
                }
                $anteriorRel = rh_ludoroyal_corona_anterior($f['pos']);
                if ($anteriorRel < $f['pos']) {
                    $f['pos'] = $anteriorRel;
                }
            }
            unset($f);
        }
    }

    return ['estado' => $estado, 'capturadas' => $resultado['capturadas']];
}

/**
 * Tira los dos dados y calcula qué se puede jugar con ese resultado —
 * mismo contrato que `rh_ludo_tirar_y_calcular()`: guarda `dadoPendiente`
 * (y acá también `simboloPendiente`) en el estado para que el endpoint de
 * mover no tenga que confiar en lo que el cliente diga que salió.
 *
 * Turno extra: SÓLO Corona (regla 2 del reglamento) — ver
 * `rh_ludoroyal_da_turno_extra()` y la nota de revisión arriba del archivo.
 *
 * @return array{estado: array, dadoNumerico: int, simbolo: string, movimientosLegales: array, turnoExtra: bool}
 */
function rh_ludoroyal_tirar_y_calcular(array $estado, int $jugador): array
{
    $dado = rh_ludoroyal_tirar_numerico();
    $simbolo = rh_ludoroyal_tirar_simbolo();
    $legales = rh_ludoroyal_movimientos_legales($estado, $jugador, $dado, $simbolo);
    $turnoExtra = rh_ludoroyal_da_turno_extra($simbolo);

    $estado['dadoPendiente'] = empty($legales) ? null : $dado;
    $estado['simboloPendiente'] = empty($legales) ? null : $simbolo;

    return [
        'estado' => $estado,
        'dadoNumerico' => $dado,
        'simbolo' => $simbolo,
        'movimientosLegales' => $legales,
        'turnoExtra' => $turnoExtra,
    ];
}

/** Heurística IA: igual criterio que el Ludo clásico — capturar > sacar > la más avanzada. */
function rh_ludoroyal_ia_elegir(array $movimientosLegales): array
{
    return rh_ludo_ia_elegir($movimientosLegales);
}

/**
 * Juega el turno completo de la IA — puede encadenar varias tiradas si hay
 * turno extra (6, Corona o Pluma), hasta que no quede ninguno o gane.
 *
 * @return array{estado: array, jugadas: array[], gano: bool}
 */
function rh_ludoroyal_turno_ia_completo(array $estado, int $jugador): array
{
    $jugadas = [];

    while (true) {
        $r = rh_ludoroyal_tirar_y_calcular($estado, $jugador);
        $estado = $r['estado'];

        if (empty($r['movimientosLegales'])) {
            $jugadas[] = ['dadoNumerico' => $r['dadoNumerico'], 'simbolo' => $r['simbolo'], 'ficha' => null, 'desde' => null, 'hasta' => null, 'capturadas' => []];
        } else {
            $elegido = rh_ludoroyal_ia_elegir($r['movimientosLegales']);
            $aplicado = rh_ludoroyal_aplicar($estado, $elegido);
            $estado = $aplicado['estado'];
            $estado['dadoPendiente'] = null;
            $estado['simboloPendiente'] = null;

            $jugadas[] = [
                'dadoNumerico' => $r['dadoNumerico'],
                'simbolo' => $r['simbolo'],
                'ficha' => ['jugador' => $elegido['ficha']['jugador'], 'num' => $elegido['ficha']['num']],
                'desde' => $elegido['desde'],
                'hasta' => $elegido['hasta'],
                'capturadas' => $aplicado['capturadas'],
            ];

            if (rh_ludo_gano($estado, $jugador)) {
                return ['estado' => $estado, 'jugadas' => $jugadas, 'gano' => true];
            }
        }

        if (!$r['turnoExtra']) {
            break;
        }
        // Guard anti-loop: turnoExtra ya exige símbolo especial o 6, así
        // que en la práctica esto no debería encadenarse mucho, pero un
        // tope de tiradas por turno evita cualquier caso patológico.
        if (count($jugadas) >= 20) {
            break;
        }
    }

    return ['estado' => $estado, 'jugadas' => $jugadas, 'gano' => false];
}

/** Puntos por partida — mismo criterio que `rh_ludo_puntos()`. */
function rh_ludoroyal_puntos(bool $gano): int
{
    return $gano ? 150 : 40;
}

/** @see rh_ludo_sala_resolver_ia_en_cadena — mismo patrón, para esta variante. */
function rh_ludoroyal_sala_resolver_ia_en_cadena(mysqli $conn, array $sala, array $jugadores): array
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
        $resultado = rh_ludoroyal_turno_ia_completo($estado, (int) $actual['Posicion']);
        $tableroJson = json_encode($resultado['estado']);
        $jugadasIA[] = ['salaJugadorId' => (int) $actual['SalaJugadorId'], 'jugadas' => $resultado['jugadas']];

        $stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
        $stmt->bind_param('si', $tableroJson, $salaId);
        $stmt->execute();
        $stmt->close();

        if ($resultado['gano']) {
            $puntos = [];
            foreach ($jugadores as $j) {
                $puntos[(int) $j['SalaJugadorId']] = rh_ludoroyal_puntos((int) $j['SalaJugadorId'] === (int) $actual['SalaJugadorId']);
            }
            rh_sala_cerrar($conn, $sala, $jugadores, (int) $actual['SalaJugadorId'], $puntos);
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
        $siguiente = rh_sala_siguiente_jugador($activos, (int) $actual['Posicion']);
        if ($siguiente !== null) {
            rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
        }

        $sala = rh_sala_obtener($conn, $salaId);
    }

    return ['sala' => $sala, 'jugadores' => rh_sala_jugadores($conn, $salaId), 'jugadasIA' => $jugadasIA];
}

/** @see rh_ludo_sala_actualizar — mismo patrón, para esta variante. */
function rh_ludoroyal_sala_actualizar(mysqli $conn, array $sala): array
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

    return rh_ludoroyal_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
}
