<?php
/**
 * HueBurako: juego NUEVO y separado de HueRummy (pedido explícito del
 * usuario — "creá el Burako también como juego nuevo, separado"), a partir
 * del mismo reglamento Ruibal (`Reglamento-RUMMY-BURAKO-Clásico-y-
 * Profesional.pdf`, sección Burako). Reusa el mazo físico de HueRummy
 * (`rh_rummy_mazo_nuevo()`/`rh_rummy_barajar()` — mismas 106 fichas) porque
 * es el mismo material, pero las reglas de juego son distintas de punta a
 * punta: acá se arma por `require_once` de `rummy.php`, mismo patrón que
 * `ludoroyal.php` reusa `ludo.php`.
 *
 * Estado en JSON:
 * `{"mazo":[ficha,...], "descarte":[ficha,...], "manos":[[ficha,...],...],
 *   "muertos":[[ficha,...],...], "compradoMuerto":[bool,...],
 *   "melds":[{"jugador":0,"cartas":[ficha,...]},...], "fase":"robar"|"descartar",
 *   "jugadores":N}`. Ficha: mismo formato que HueRummy (`color` 0-3,
 * `valor` 1-13; comodín dedicado = `{"color":-1,"valor":0}`).
 *
 * **Decisiones de alcance ya tomadas, no reabrir** (mismo criterio de
 * documentar en vez de bloquear que ya usan `rummy.php`/`ludoroyal.php`):
 * - **Sin parejas**: el reglamento real es 2 o 4 jugadores EN PAREJAS
 *   (equipo comparte muerto y puntaje). La infraestructura de salas de este
 *   proyecto (`salas.php`) no tiene concepto de equipos — agregarlo es un
 *   cambio estructural grande para todo el catálogo de salas, no sólo este
 *   juego. Se implementa la variante INDIVIDUAL: 2 a 4 jugadores, cada uno
 *   con SU PROPIO muerto y puntaje — el reglamento mismo habilita jugar sin
 *   pareja ("si la partida se realiza solamente entre dos jugadores, el
 *   reglamento es el mismo"), así que no es una regla inventada, es
 *   generalizar esa misma excepción a cualquier cantidad de jugadores.
 * - **11 fichas de mano + 11 de muerto por jugador** (en vez de 11+11 por
 *   PAREJA): mismo total de recursos por persona que la versión de a dos,
 *   aplicado a cada individuo — no hay un número "oficial" para esto en el
 *   reglamento porque no contempla más de 2 jugadores sin pareja.
 * - **"Comprar el muerto" simplificado**: el reglamento distingue compra
 *   directa (bajaste todo en una sola jugada) e indirecta (te quedaste sin
 *   fichas al descartar) con timing distinto para cuándo podés usar el
 *   muerto. Acá las dos se unifican: la PRIMERA vez que te quedás sin
 *   fichas en la mano (por la razón que sea) recibís el muerto entero de
 *   inmediato y seguís jugando ese mismo turno — no cambia la esencia del
 *   mecanismo (te quedaste sin fichas una vez, seguís jugando con el
 *   muerto), sólo el detalle de timing de un caso puntual.
 * - **Cierre sin exigir Canasta previa**: el reglamento exige tener una
 *   Canasta concretada para poder cerrar. Acá cualquier jugador que ya
 *   compró su muerto y se vuelve a quedar sin fichas cierra la ronda
 *   directamente — no se bloquea el cierre por no tener Canasta. Se
 *   documenta como simplificación: agregar esa validación cruzada
 *   (impedir descartar la última ficha sin Canasta) es lógica extra sin
 *   cambiar la identidad del juego (el mecanismo de Canasta/muerto/puntaje
 *   sigue intacto).
 * - **Escalera con vuelta 13-1**: SÍ implementada (`rh_burako_armar_escalera()`,
 *   probando las 13 rotaciones posibles del círculo 1-13) — a diferencia de
 *   HueRummy, acá el reglamento la pide explícitamente con ejemplo
 *   ("10-11-12-13-1 amarillos").
 * - **El número 2 como comodín SIEMPRE**: el reglamento dice que además de
 *   los 2 comodines con figura, "las fichas con el número 2 también
 *   funcionan como comodines" — pero no aclara qué pasa si alguien arma un
 *   trío de 2s "de verdad". Acá se simplifica: TODO 2 actúa siempre como
 *   comodín (nunca como su valor propio dentro de un juego) — evita el
 *   problema de decidir, ficha por ficha, cuándo un 2 "vale por sí mismo" y
 *   cuándo sustituye a otra cosa dentro de la misma selección.
 */

require_once __DIR__ . '/rummy.php';

const RH_BURAKO_FICHAS_POR_JUGADOR = 11;
const RH_BURAKO_CANASTA_MINIMO = 7;
const RH_BURAKO_PUNTOS_OBJETIVO = 3000; // el reglamento dice "300" pero es claramente una errata frente a esta escala de puntaje

function rh_burako_es_comodin(array $f): bool
{
    return (int) $f['color'] === -1 || (int) $f['valor'] === 2;
}

/** Valor de una ficha para el puntaje de Burako — tabla propia, distinta de HueRummy (ver reglamento: Nº1=15, Nº2=20, 3-7=5, 8-13=10, comodín=50). */
function rh_burako_valor_ficha(array $f): int
{
    if (rh_burako_es_comodin($f)) {
        if ((int) $f['color'] !== -1 && isset($f['sustituyeValor'])) {
            // Un 2 actuando de comodín: para el puntaje vale como comodín (50), no como "2".
            return 50;
        }
        return isset($f['sustituyeValor']) ? rh_burako_valor_por_numero((int) $f['sustituyeValor']) : 50;
    }
    return rh_burako_valor_por_numero((int) $f['valor']);
}

function rh_burako_valor_por_numero(int $valor): int
{
    if ($valor === 1) {
        return 15;
    }
    if ($valor === 2) {
        return 20;
    }
    if ($valor >= 3 && $valor <= 7) {
        return 5;
    }
    return 10; // 8-13
}

function rh_burako_valor_efectivo(array $f): int
{
    return rh_burako_es_comodin($f) ? (int) ($f['sustituyeValor'] ?? 0) : (int) $f['valor'];
}

/**
 * ¿Las fichas forman una Escalera válida (3+ consecutivas, mismo color, CON
 * vuelta permitida 13→1)? Prueba las 13 rotaciones posibles del círculo
 * 1-13 hasta encontrar una en la que las reales (sin comodín) calcen sin
 * huecos más grandes que los comodines disponibles.
 */
function rh_burako_armar_escalera(array $cartas, ?array &$armada = null): bool
{
    $n = count($cartas);
    if ($n < 3) {
        return false;
    }

    $reales = [];
    $comodines = [];
    foreach ($cartas as $c) {
        if (rh_burako_es_comodin($c)) {
            $comodines[] = $c;
        } else {
            $reales[] = $c;
        }
    }
    if (count($reales) === 0) {
        return false;
    }

    $color = (int) $reales[0]['color'];
    foreach ($reales as $r) {
        if ((int) $r['color'] !== $color) {
            return false;
        }
    }

    for ($rot = 0; $rot < 13; $rot++) {
        $rotados = array_map(fn ($r) => ['orig' => (int) $r['valor'], 'rot' => (((int) $r['valor'] - 1 + $rot) % 13) + 1], $reales);
        usort($rotados, fn ($a, $b) => $a['rot'] <=> $b['rot']);

        $dup = false;
        for ($i = 1; $i < count($rotados); $i++) {
            if ($rotados[$i]['rot'] === $rotados[$i - 1]['rot']) {
                $dup = true;
                break;
            }
        }
        if ($dup) {
            continue;
        }

        $v1 = $rotados[0]['rot'];
        $vk = $rotados[count($rotados) - 1]['rot'];
        $huecosInternos = ($vk - $v1 + 1) - count($rotados);
        if ($huecosInternos > count($comodines)) {
            continue;
        }
        $restantes = count($comodines) - $huecosInternos;
        $espacioAntes = $v1 - 1;
        $espacioDespues = 13 - $vk;
        if ($restantes > $espacioAntes + $espacioDespues) {
            continue;
        }

        $antes = min($restantes, $espacioAntes);
        $despues = $restantes - $antes;
        if ($despues > $espacioDespues) {
            $despues = $espacioDespues;
            $antes = $restantes - $despues;
        }

        $invertir = fn (int $rotVal): int => ((($rotVal - 1 - $rot) % 13 + 13) % 13) + 1;

        $comodinIdx = 0;
        $resultado = [];
        for ($v = $v1 - $antes; $v < $v1; $v++) {
            $resultado[] = rh_rummy_comodin_como($comodines[$comodinIdx++], $color, $invertir($v));
        }
        $realIdx = 0;
        for ($v = $v1; $v <= $vk; $v++) {
            if ($realIdx < count($rotados) && $rotados[$realIdx]['rot'] === $v) {
                $resultado[] = ['color' => $color, 'valor' => $rotados[$realIdx]['orig']];
                $realIdx++;
            } else {
                $resultado[] = rh_rummy_comodin_como($comodines[$comodinIdx++], $color, $invertir($v));
            }
        }
        for ($v = $vk + 1; $v <= $vk + $despues; $v++) {
            $resultado[] = rh_rummy_comodin_como($comodines[$comodinIdx++], $color, $invertir($v));
        }

        $armada = $resultado;
        return true;
    }

    return false;
}

/** Pierna de Burako: 3-4 fichas del mismo número, COLORES LIBRES (pueden repetirse) — a diferencia de HueRummy. */
function rh_burako_armar_pierna(array $cartas, ?array &$armada = null): bool
{
    $n = count($cartas);
    if ($n < 3 || $n > 4) {
        return false;
    }

    $reales = [];
    $comodines = [];
    foreach ($cartas as $c) {
        if (rh_burako_es_comodin($c)) {
            $comodines[] = $c;
        } else {
            $reales[] = $c;
        }
    }
    if (count($reales) === 0) {
        return false;
    }

    $valor = (int) $reales[0]['valor'];
    foreach ($reales as $r) {
        if ((int) $r['valor'] !== $valor) {
            return false;
        }
    }

    $colorRelleno = (int) $reales[0]['color'];
    $resultado = $reales;
    foreach ($comodines as $c) {
        $resultado[] = rh_rummy_comodin_como($c, $colorRelleno, $valor);
    }
    $armada = $resultado;
    return true;
}

function rh_burako_armar_meld(array $cartas, ?array &$armada = null): bool
{
    return rh_burako_armar_escalera($cartas, $armada) || rh_burako_armar_pierna($cartas, $armada);
}

/** ¿Un meld ya bajado llegó a Canasta (7+ fichas)? Pura = sin comodín, Impura = con al menos uno. */
function rh_burako_tipo_canasta(array $cartas): ?string
{
    if (count($cartas) < RH_BURAKO_CANASTA_MINIMO) {
        return null;
    }
    foreach ($cartas as $c) {
        if (rh_burako_es_comodin($c)) {
            return 'impura';
        }
    }
    return 'pura';
}

function rh_burako_inicial(int $jugadores): string
{
    $mazo = rh_rummy_barajar(rh_rummy_mazo_nuevo());

    $manos = [];
    $muertos = [];
    for ($j = 0; $j < $jugadores; $j++) {
        $mano = [];
        for ($c = 0; $c < RH_BURAKO_FICHAS_POR_JUGADOR; $c++) {
            $mano[] = array_pop($mazo);
        }
        $manos[] = $mano;

        $muerto = [];
        for ($c = 0; $c < RH_BURAKO_FICHAS_POR_JUGADOR; $c++) {
            $muerto[] = array_pop($mazo);
        }
        $muertos[] = $muerto;
    }

    $descarte = [array_pop($mazo)];

    return json_encode([
        'mazo' => $mazo,
        'descarte' => $descarte,
        'manos' => $manos,
        'muertos' => $muertos,
        'compradoMuerto' => array_fill(0, $jugadores, false),
        'melds' => [],
        'fase' => 'robar',
        'jugadores' => $jugadores,
    ]);
}

function rh_burako_puede_robar(array $estado): bool
{
    return count($estado['mazo']) > 0 || count($estado['descarte']) > 1;
}

/**
 * Roba una ficha para $jugador, del mazo o del tope del descarte.
 *
 * @return array{estado: array, carta: ?array, error: ?string}
 */
function rh_burako_robar(array $estado, int $jugador, string $origen): array
{
    if ($estado['fase'] !== 'robar') {
        return ['estado' => $estado, 'carta' => null, 'error' => 'Ya robaste, te falta descartar'];
    }

    if ($origen === 'descarte') {
        if (count($estado['descarte']) === 0) {
            return ['estado' => $estado, 'carta' => null, 'error' => 'No hay descarte de dónde robar'];
        }
        // El reglamento pide levantar TODO el pozo, no sólo el tope.
        $carta = array_pop($estado['descarte']);
        $estado['manos'][$jugador] = array_merge($estado['manos'][$jugador], $estado['descarte']);
        $estado['descarte'] = [];
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

/** Si al bajar/extender un jugador se quedó sin fichas, le da su muerto la primera vez (ver nota de alcance arriba). */
function rh_burako_revisar_muerto(array $estado, int $jugador): array
{
    if (count($estado['manos'][$jugador]) === 0 && !$estado['compradoMuerto'][$jugador]) {
        $estado['manos'][$jugador] = $estado['muertos'][$jugador];
        $estado['muertos'][$jugador] = [];
        $estado['compradoMuerto'][$jugador] = true;
    }
    return $estado;
}

/**
 * Baja un meld NUEVO con fichas de la mano de $jugador. A diferencia de
 * HueRummy no hay mínimo de puntos de apertura (el reglamento de Burako no
 * lo pide).
 *
 * @return array{estado: array, error: ?string}
 */
function rh_burako_bajar_meld(array $estado, int $jugador, array $indices): array
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
            return ['estado' => $estado, 'error' => 'Índice de ficha inválido'];
        }
        $cartas[] = $mano[$i];
    }

    $armada = null;
    if (!rh_burako_armar_meld($cartas, $armada)) {
        return ['estado' => $estado, 'error' => 'Esas fichas no forman un juego válido'];
    }

    foreach (array_reverse($indices) as $i) {
        array_splice($mano, $i, 1);
    }
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][] = ['jugador' => $jugador, 'cartas' => $armada];

    $estado = rh_burako_revisar_muerto($estado, $jugador);

    return ['estado' => $estado, 'error' => null];
}

/** Agrega fichas de la mano de $jugador a un meld ya bajado (propio o ajeno). */
function rh_burako_extender_meld(array $estado, int $jugador, int $meldIndex, array $indices): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'error' => 'Primero tenés que robar'];
    }
    if (!isset($estado['melds'][$meldIndex])) {
        return ['estado' => $estado, 'error' => 'Ese juego no existe'];
    }

    $mano = $estado['manos'][$jugador];
    $indices = array_values(array_unique($indices));
    sort($indices);

    $nuevas = [];
    foreach ($indices as $i) {
        if (!isset($mano[$i])) {
            return ['estado' => $estado, 'error' => 'Índice de ficha inválido'];
        }
        $nuevas[] = $mano[$i];
    }

    $meld = $estado['melds'][$meldIndex];
    $armada = null;
    if (!rh_burako_armar_meld(array_merge($meld['cartas'], $nuevas), $armada)) {
        return ['estado' => $estado, 'error' => 'Esas fichas no se pueden agregar a ese juego'];
    }

    foreach (array_reverse($indices) as $i) {
        array_splice($mano, $i, 1);
    }
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][$meldIndex]['cartas'] = $armada;

    $estado = rh_burako_revisar_muerto($estado, $jugador);

    return ['estado' => $estado, 'error' => null];
}

/** Canjea un comodín bajado en una Escalera por la ficha real que sustituye — mismo mecanismo que HueRummy. */
function rh_burako_intercambiar_comodin(array $estado, int $jugador, int $meldIndex, int $indiceEnMano): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'error' => 'Primero tenés que robar'];
    }
    if (!isset($estado['melds'][$meldIndex])) {
        return ['estado' => $estado, 'error' => 'Ese juego no existe'];
    }
    $mano = $estado['manos'][$jugador];
    if (!isset($mano[$indiceEnMano])) {
        return ['estado' => $estado, 'error' => 'Índice de ficha inválido'];
    }
    $real = $mano[$indiceEnMano];
    if (rh_burako_es_comodin($real)) {
        return ['estado' => $estado, 'error' => 'Tenés que ofrecer una ficha que no sea comodín'];
    }

    $cartas = $estado['melds'][$meldIndex]['cartas'];
    if (!rh_burako_armar_escalera($cartas, $armadaActual)) {
        return ['estado' => $estado, 'error' => 'Ese juego no es una Escalera, no se puede canjear así'];
    }

    $posicion = null;
    foreach ($cartas as $i => $c) {
        if (rh_burako_es_comodin($c) && (int) ($c['sustituyeColor'] ?? -1) === (int) $real['color'] && (int) ($c['sustituyeValor'] ?? -1) === (int) $real['valor']) {
            $posicion = $i;
            break;
        }
    }
    if ($posicion === null) {
        return ['estado' => $estado, 'error' => 'Ningún comodín de ese juego sustituye a esa ficha'];
    }

    $comodinLiberado = $cartas[$posicion];
    unset($comodinLiberado['sustituyeColor'], $comodinLiberado['sustituyeValor']);
    $cartas[$posicion] = $real;

    usort($cartas, fn ($a, $b) => rh_burako_valor_efectivo($a) <=> rh_burako_valor_efectivo($b));
    $v1 = rh_burako_valor_efectivo($cartas[0]);
    $vk = rh_burako_valor_efectivo($cartas[count($cartas) - 1]);
    $color = (int) $real['color'];
    foreach ($cartas as $c) {
        if (!rh_burako_es_comodin($c)) {
            $color = (int) $c['color'];
            break;
        }
    }

    if ($v1 > 1) {
        $cartas[] = rh_rummy_comodin_como($comodinLiberado, $color, $v1 - 1);
    } elseif ($vk < 13) {
        $cartas[] = rh_rummy_comodin_como($comodinLiberado, $color, $vk + 1);
    } else {
        return ['estado' => $estado, 'error' => 'Esa Escalera ya ocupa del 1 al 13, no hay dónde reubicar el comodín'];
    }
    usort($cartas, fn ($a, $b) => rh_burako_valor_efectivo($a) <=> rh_burako_valor_efectivo($b));

    array_splice($mano, $indiceEnMano, 1);
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][$meldIndex]['cartas'] = $cartas;

    return ['estado' => $estado, 'error' => null];
}

/**
 * Descarta una ficha y cierra el turno. Si te quedás sin fichas y ya
 * habías comprado tu muerto antes, cerrás la ronda (ver nota de alcance:
 * acá no se exige tener una Canasta para poder cerrar).
 *
 * @return array{estado: array, carta: ?array, gano: bool, error: ?string}
 */
function rh_burako_descartar(array $estado, int $jugador, int $indice): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'carta' => null, 'gano' => false, 'error' => 'Primero tenés que robar'];
    }

    $mano = $estado['manos'][$jugador];
    if (!isset($mano[$indice])) {
        return ['estado' => $estado, 'carta' => null, 'gano' => false, 'error' => 'Índice de ficha inválido'];
    }

    $carta = $mano[$indice];
    array_splice($mano, $indice, 1);
    $estado['manos'][$jugador] = $mano;
    $estado['descarte'][] = $carta;
    $estado['fase'] = 'robar';

    $vacia = count($mano) === 0;
    if ($vacia && !$estado['compradoMuerto'][$jugador]) {
        $estado = rh_burako_revisar_muerto($estado, $jugador);
        return ['estado' => $estado, 'carta' => $carta, 'gano' => false, 'error' => null];
    }

    return ['estado' => $estado, 'carta' => $carta, 'gano' => $vacia, 'error' => null];
}

/**
 * Puntaje final de $jugador al cerrarse la ronda: valor de todo lo que
 * abrió (sus melds, incluidas fichas que otros le hayan agregado — ver nota
 * de alcance sobre por qué un meld sigue siendo "de quien lo abrió"), más
 * 100/200 por cada Canasta Impura/Pura que haya abierto, más 100 si compró
 * el muerto, menos 100 si NUNCA lo compró, menos el valor de lo que le
 * quedó sin bajar en la mano, más 100 extra si fue quien cerró la ronda.
 */
function rh_burako_puntaje_final(array $estado, int $jugador, bool $huboCierre, ?int $jugadorQueCerro): int
{
    $puntos = 0;
    foreach ($estado['melds'] as $meld) {
        if ((int) $meld['jugador'] !== $jugador) {
            continue;
        }
        $puntos += array_sum(array_map('rh_burako_valor_ficha', $meld['cartas']));
        $tipo = rh_burako_tipo_canasta($meld['cartas']);
        if ($tipo === 'pura') {
            $puntos += 200;
        } elseif ($tipo === 'impura') {
            $puntos += 100;
        }
    }

    $puntos += $estado['compradoMuerto'][$jugador] ? 100 : -100;
    $puntos -= array_sum(array_map('rh_burako_valor_ficha', $estado['manos'][$jugador] ?? []));

    if ($huboCierre && $jugadorQueCerro === $jugador) {
        $puntos += 100;
    }

    return $puntos;
}

/** Heurística de la IA: mismo criterio greedy que HueRummy, adaptado a los juegos de Burako (colores libres en la Pierna, vuelta en la Escalera). */
function rh_burako_ia_encontrar_melds(array $mano): array
{
    $restantes = array_keys($mano);
    $esComodinIdx = fn ($i) => rh_burako_es_comodin($mano[$i]);
    $comodinesLibres = array_values(array_filter($restantes, $esComodinIdx));
    $restantes = array_values(array_diff($restantes, $comodinesLibres));
    $melds = [];

    $porValor = [];
    foreach ($restantes as $i) {
        $porValor[$mano[$i]['valor']][] = $i;
    }
    foreach ($porValor as $indicesValor) {
        $grupo = array_slice($indicesValor, 0, 4);
        if (count($grupo) >= 3) {
            $melds[] = $grupo;
        } elseif (count($grupo) === 2 && $comodinesLibres) {
            $melds[] = array_merge($grupo, [array_shift($comodinesLibres)]);
        }
    }
    $usadosTotal = [];
    foreach ($melds as $m) {
        $usadosTotal = array_merge($usadosTotal, $m);
    }
    $restantes = array_values(array_diff($restantes, $usadosTotal));

    $porColor = [];
    foreach ($restantes as $i) {
        $porColor[$mano[$i]['color']][] = $i;
    }
    foreach ($porColor as $indicesColor) {
        usort($indicesColor, fn ($a, $b) => $mano[$a]['valor'] <=> $mano[$b]['valor']);
        $corrida = [];
        foreach ($indicesColor as $i) {
            if ($corrida && $mano[$i]['valor'] !== $mano[end($corrida)]['valor'] + 1) {
                if (count($corrida) >= 3) {
                    $melds[] = $corrida;
                } elseif (count($corrida) === 2 && $comodinesLibres) {
                    $melds[] = array_merge($corrida, [array_shift($comodinesLibres)]);
                }
                $corrida = [];
            }
            $corrida[] = $i;
        }
        if (count($corrida) >= 3) {
            $melds[] = $corrida;
        } elseif (count($corrida) === 2 && $comodinesLibres) {
            $melds[] = array_merge($corrida, [array_shift($comodinesLibres)]);
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
 * Juega el turno completo de la IA: roba, baja lo que encuentre, intenta
 * pegar sueltas en melds ya bajados (mismo fix que HueRummy — sin esto se
 * traba con 1-2 fichas para siempre), y descarta la peor.
 *
 * @return array{estado: array, robo: array, melds: array[], descarte: ?array, gano: bool}
 */
function rh_burako_turno_ia_completo(array $estado, int $jugador): array
{
    $manoAntes = $estado['manos'][$jugador];
    $tomaDescarte = false;
    if (count($estado['descarte']) > 0) {
        $candidata = end($estado['descarte']);
        $manoConDescarte = $manoAntes;
        $manoConDescarte[] = $candidata;
        $prueba = rh_burako_ia_encontrar_melds($manoConDescarte);
        if ($prueba['melds']) {
            $tomaDescarte = true;
        }
    }

    $resultado = rh_burako_robar($estado, $jugador, $tomaDescarte ? 'descarte' : 'mazo');
    $estado = $resultado['estado'];
    $cartaRobada = $resultado['carta'];

    $melds = [];
    $encontrados = rh_burako_ia_encontrar_melds($estado['manos'][$jugador]);
    foreach ($encontrados['melds'] as $indices) {
        $mano = $estado['manos'][$jugador];
        $indicesReales = array_values(array_filter($indices, fn ($i) => isset($mano[$i])));
        if (count($indicesReales) < 3) {
            continue;
        }
        $cartasDelMeld = array_map(fn ($i) => $mano[$i], $indicesReales);
        $r = rh_burako_bajar_meld($estado, $jugador, $indicesReales);
        if ($r['error'] !== null) {
            continue;
        }
        $estado = $r['estado'];
        $melds[] = $cartasDelMeld;
        if (count($estado['manos'][$jugador]) === 0) {
            break; // se quedó sin fichas: ya recibió el muerto adentro de rh_burako_bajar_meld
        }
    }

    $siguioPegando = true;
    while ($siguioPegando) {
        $siguioPegando = false;
        $mano = $estado['manos'][$jugador];
        foreach ($mano as $i => $ficha) {
            foreach ($estado['melds'] as $mi => $meld) {
                $armada = null;
                if (rh_burako_armar_meld(array_merge($meld['cartas'], [$ficha]), $armada)) {
                    $r = rh_burako_extender_meld($estado, $jugador, $mi, [$i]);
                    if ($r['error'] === null) {
                        $estado = $r['estado'];
                        $siguioPegando = true;
                        continue 3;
                    }
                }
            }
        }
    }

    $mano = $estado['manos'][$jugador];
    if (count($mano) === 0) {
        // Ya recibió el muerto si era la primera vez (ver rh_burako_revisar_muerto);
        // si esto pasa es porque YA lo había comprado antes -> cierra la ronda.
        return ['estado' => $estado, 'robo' => $cartaRobada, 'melds' => $melds, 'descarte' => null, 'gano' => $estado['compradoMuerto'][$jugador]];
    }

    $peorIndice = 0;
    $peorValor = -1;
    foreach ($mano as $i => $c) {
        $v = rh_burako_es_comodin($c) ? -1 : rh_burako_valor_ficha($c); // nunca descarta un comodín si hay otra opción
        if ($v > $peorValor) {
            $peorValor = $v;
            $peorIndice = $i;
        }
    }
    $cartaDescartada = $mano[$peorIndice];
    $rd = rh_burako_descartar($estado, $jugador, $peorIndice);
    $estado = $rd['estado'];

    return ['estado' => $estado, 'robo' => $cartaRobada, 'melds' => $melds, 'descarte' => $cartaDescartada, 'gano' => $rd['gano']];
}

/** Vista del estado segura para mandar al cliente que mira desde `$miPosicion` — mismo criterio que `rh_rummy_estado_visible()`. */
function rh_burako_estado_visible(array $estado, int $miPosicion): array
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
        'compradoMuerto' => $estado['compradoMuerto'],
        'miMuertoPendiente' => count($estado['muertos'][$miPosicion] ?? []) > 0,
    ];
}

/** Puntos de cuenta (no de la partida en sí) que deja jugar Burako. Mismo criterio fijo que el resto del catálogo. */
function rh_burako_puntos(bool $gano): int
{
    return $gano ? 150 : 40;
}

/** Cierra la ronda: calcula puntaje final de todos y llama a `rh_sala_cerrar()`. */
function rh_burako_cerrar_ronda(mysqli $conn, array $sala, array $jugadores, array $estado, bool $huboCierre, ?int $posicionQueCerro): array
{
    $puntajes = [];
    foreach ($jugadores as $j) {
        $puntajes[(int) $j['SalaJugadorId']] = rh_burako_puntaje_final($estado, (int) $j['Posicion'], $huboCierre, $posicionQueCerro);
    }
    $mejorId = null;
    $mejorValor = null;
    $empate = false;
    foreach ($puntajes as $id => $valor) {
        if ($mejorValor === null || $valor > $mejorValor) {
            $mejorValor = $valor;
            $mejorId = $id;
            $empate = false;
        } elseif ($valor === $mejorValor) {
            $empate = true;
        }
    }
    $ganadorId = $empate ? null : $mejorId;

    $puntosCuenta = [];
    foreach ($jugadores as $j) {
        $puntosCuenta[(int) $j['SalaJugadorId']] = rh_burako_puntos($ganadorId !== null && (int) $j['SalaJugadorId'] === $ganadorId);
    }
    rh_sala_cerrar($conn, $sala, $jugadores, $ganadorId, $puntosCuenta);

    return ['ganadorId' => $ganadorId, 'puntajes' => $puntajes];
}

/**
 * Mientras a quien le toca jugar sea un asiento de IA, le juega el turno y
 * pasa al siguiente — mismo patrón que `rh_rummy_sala_resolver_ia_en_cadena()`.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_burako_sala_resolver_ia_en_cadena(mysqli $conn, array $sala, array $jugadores): array
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

        if (!rh_burako_puede_robar($estado)) {
            $huboCanasta = false;
            foreach ($estado['melds'] as $m) {
                if (rh_burako_tipo_canasta($m['cartas']) !== null) {
                    $huboCanasta = true;
                    break;
                }
            }
            if ($huboCanasta) {
                rh_burako_cerrar_ronda($conn, $sala, $jugadores, $estado, false, null);
            } else {
                rh_sala_cerrar($conn, $sala, $jugadores, null, array_fill_keys(array_map(fn ($j) => (int) $j['SalaJugadorId'], $jugadores), rh_burako_puntos(false)));
            }
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $resultado = rh_burako_turno_ia_completo($estado, $posicion);
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
            rh_burako_cerrar_ronda($conn, $sala, $jugadores, $resultado['estado'], true, $posicion);
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
        $siguiente = rh_sala_siguiente_jugador($activos, $posicion);
        if ($siguiente !== null) {
            rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
        }

        $sala = rh_sala_obtener($conn, $salaId);
    }

    return ['sala' => $sala, 'jugadores' => rh_sala_jugadores($conn, $salaId), 'jugadasIA' => $jugadasIA];
}

/**
 * Punto de entrada único para dejar una sala de Burako al día — mismo
 * patrón que `rh_rummy_sala_actualizar()`.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_burako_sala_actualizar(mysqli $conn, array $sala): array
{
    $salaId = (int) $sala['SalaId'];

    if ($sala['Estado'] === 'jugando' && $sala['TurnoVenceEn'] !== null && strtotime($sala['TurnoVenceEn']) <= time()) {
        rh_sala_resolver_turno_vencido($conn, $sala);
        $sala = rh_sala_obtener($conn, $salaId);
    }

    $jugadores = rh_sala_jugadores($conn, $salaId);
    if ($sala['Estado'] !== 'jugando') {
        return ['sala' => $sala, 'jugadores' => $jugadores, 'jugadasIA' => []];
    }

    return rh_burako_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
}
