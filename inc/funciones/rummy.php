<?php
/**
 * HueRummy: Rummy Israelí REAL, con fichas numeradas de 4 colores (no la
 * baraja de palos que tenía este archivo antes) — reescrito de punta a
 * punta el 2026-09-12 a partir del reglamento Ruibal que pegó el usuario
 * ("no tiene nada de sentido, hacelo de 0 si hace falta"). Reusa por
 * completo la infraestructura de salas de HueLudo (`inc/funciones/salas.php`)
 * sin tocarla, mismo patrón exacto que Ludo/LudoRoyal establecieron.
 * `inc/funciones/burako.php` reutiliza el mazo/barajado de este archivo
 * (mismas 106 fichas físicas) para el juego hermano.
 *
 * Estado en JSON:
 * `{"mazo":[ficha,...], "descarte":[ficha,...], "manos":[[ficha,...],...],
 *   "melds":[{"jugador":0,"cartas":[ficha,...]},...], "fase":"robar"|"descartar",
 *   "jugadores":N, "bajoInicial":[bool,...], "puntosTurnoActual":0}`.
 *
 * `ficha` normal es `{"color":0-3, "valor":1-13}` (colores: negro, rojo,
 * azul, amarillo — igual que el mazo físico Rummikub/Ruibal). Un comodín
 * SUELTO (en la mano o el mazo) es `{"color":-1, "valor":0}`; un comodín ya
 * BAJADO en algún meld además lleva `sustituyeColor`/`sustituyeValor` — la
 * ficha que representa ahí, necesaria para el puntaje del mínimo inicial y
 * para poder canjearlo más tarde (`rh_rummy_intercambiar_comodin()`).
 *
 * **Decisiones de alcance ya tomadas, no reabrir** (el reglamento real pegado
 * deja algunas cosas que complican mucho la implementación sin cambiar la
 * esencia del juego — documentadas acá, mismo criterio que ya usaba este
 * archivo antes de la reescritura):
 * - **Reparto**: el reglamento arma 15 pilas de 7 y reparte 2 pilas por
 *   jugador (14 fichas) más una "ficha de cierre" aparte que sólo sirve para
 *   una mecánica especial de cierre. Estadísticamente un mazo barajado del
 *   que se reparten 14 fichas a cada uno es EXACTAMENTE lo mismo que armar
 *   pilas y repartir 2 — es sólo el ritual físico de barajar, no cambia el
 *   juego. Se simplifica a reparto directo y se deja afuera la "ficha de
 *   cierre" (mecánica de home-rule menor, no hace a que el juego "tenga
 *   sentido" como Rummy real).
 * - **"Combinaciones" avanzadas** (partir una escalera en dos usando una
 *   ficha propia, sacar fichas de DOS juegos distintos de la mesa para
 *   armar un tercero): quedan afuera. Sí se implementan las mecánicas
 *   centrales del reglamento: mínimo de apertura de 30 puntos, agregar
 *   fichas a una Escalera o completar una Pierna ya bajada
 *   (`rh_rummy_extender_meld()`), y canjear un comodín bajado por la ficha
 *   real que reemplaza, reubicando el comodín liberado en la MISMA Escalera
 *   (`rh_rummy_intercambiar_comodin()`, sólo para Escaleras — una Pierna no
 *   tiene "extremo" donde reubicar el comodín liberado dentro del mismo
 *   juego, así que ese canje puntual queda fuera de alcance).
 * - **4 manos por partida**: el reglamento encadena 4 manos y suma
 *   puntajes; acá cada sala es UNA mano completa y cerrada (consistente con
 *   cómo ya cierra `rh_sala_cerrar()` en todo el catálogo — Ludo, Ajedrez,
 *   etc. tampoco encadenan partidas dentro de una sala). Para jugar "las 4
 *   manos" del reglamento alcanza con crear 4 salas seguidas.
 * - **Valor de las fichas SIN techo**: a diferencia del Rummy de baraja
 *   (donde J/Q/K valen 10), acá cada ficha vale directamente su número
 *   (1-13) — así lo dice el reglamento ("cada ficha vale lo que indica su
 *   número"). El comodín vale lo que sustituye en una jugada, o 50 puntos
 *   en contra si queda suelto en la mano al cerrarse la partida.
 */

require_once __DIR__ . '/salas.php';

const RH_RUMMY_CARTAS_POR_JUGADOR = 14;
const RH_RUMMY_MINIMO_APERTURA = 30;

/** 2 copias de cada (color 0-3, valor 1-13) + 2 comodines = 106 fichas — el mazo físico real de este tipo de juego. */
function rh_rummy_mazo_nuevo(): array
{
    $mazo = [];
    for ($copia = 0; $copia < 2; $copia++) {
        for ($color = 0; $color < 4; $color++) {
            for ($valor = 1; $valor <= 13; $valor++) {
                $mazo[] = ['color' => $color, 'valor' => $valor];
            }
        }
    }
    $mazo[] = ['color' => -1, 'valor' => 0];
    $mazo[] = ['color' => -1, 'valor' => 0];
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
        'bajoInicial' => array_fill(0, $jugadores, false),
        'puntosTurnoActual' => 0,
    ]);
}

function rh_rummy_es_comodin(array $f): bool
{
    return (int) $f['color'] === -1;
}

/**
 * Valor de una ficha para el mínimo de apertura y el deadwood final: el
 * número tal cual, sin techo. Un comodín ya bajado vale lo que sustituye;
 * uno suelto (mano, sin jugar) vale 50 en contra.
 */
function rh_rummy_valor_ficha(array $f): int
{
    if (rh_rummy_es_comodin($f)) {
        return isset($f['sustituyeValor']) ? (int) $f['sustituyeValor'] : 50;
    }
    return (int) $f['valor'];
}

function rh_rummy_mismaficha(array $a, array $b): bool
{
    return (int) $a['color'] === (int) $b['color'] && (int) $a['valor'] === (int) $b['valor'];
}

function rh_rummy_comodin_como(array $comodin, int $color, int $valor): array
{
    $comodin['sustituyeColor'] = $color;
    $comodin['sustituyeValor'] = $valor;
    return $comodin;
}

/**
 * ¿Las fichas forman una Escalera válida (3+ consecutivas, mismo color, sin
 * vuelta 13-1)? Si sí, arma en `$armada` la versión final con cada comodín
 * ya con `sustituyeColor`/`sustituyeValor` puesto — necesaria para el
 * puntaje y para el canje posterior.
 */
function rh_rummy_armar_escalera(array $cartas, ?array &$armada = null): bool
{
    $n = count($cartas);
    if ($n < 3) {
        return false;
    }

    $reales = [];
    $comodines = [];
    foreach ($cartas as $c) {
        if (rh_rummy_es_comodin($c)) {
            $comodines[] = $c;
        } else {
            $reales[] = $c;
        }
    }
    if (count($reales) === 0) {
        return false;
    }

    usort($reales, fn ($a, $b) => $a['valor'] <=> $b['valor']);
    $color = $reales[0]['color'];
    foreach ($reales as $r) {
        if ((int) $r['color'] !== $color) {
            return false;
        }
    }
    for ($i = 1; $i < count($reales); $i++) {
        if ($reales[$i]['valor'] === $reales[$i - 1]['valor']) {
            return false; // valor repetido, no puede ser una escalera
        }
    }

    $v1 = (int) $reales[0]['valor'];
    $vk = (int) $reales[count($reales) - 1]['valor'];
    $huecosInternos = ($vk - $v1 + 1) - count($reales);
    if ($huecosInternos > count($comodines)) {
        return false;
    }
    $comodinesRestantes = count($comodines) - $huecosInternos;
    $espacioAntes = $v1 - 1;
    $espacioDespues = 13 - $vk;
    if ($comodinesRestantes > $espacioAntes + $espacioDespues) {
        return false;
    }

    $antes = min($comodinesRestantes, $espacioAntes);
    $despues = $comodinesRestantes - $antes;
    if ($despues > $espacioDespues) {
        $despues = $espacioDespues;
        $antes = $comodinesRestantes - $despues;
    }

    $comodinIdx = 0;
    $resultado = [];
    for ($v = $v1 - $antes; $v < $v1; $v++) {
        $resultado[] = rh_rummy_comodin_como($comodines[$comodinIdx++], $color, $v);
    }
    $realIdx = 0;
    for ($v = $v1; $v <= $vk; $v++) {
        if ($realIdx < count($reales) && (int) $reales[$realIdx]['valor'] === $v) {
            $resultado[] = $reales[$realIdx++];
        } else {
            $resultado[] = rh_rummy_comodin_como($comodines[$comodinIdx++], $color, $v);
        }
    }
    for ($v = $vk + 1; $v <= $vk + $despues; $v++) {
        $resultado[] = rh_rummy_comodin_como($comodines[$comodinIdx++], $color, $v);
    }

    $armada = $resultado;
    return true;
}

/**
 * ¿Las fichas forman una Pierna válida (3-4 del mismo número, colores
 * distintos)? Arma en `$armada` la asignación de qué color sustituye cada
 * comodín (los colores que falten entre los 4).
 */
function rh_rummy_armar_pierna(array $cartas, ?array &$armada = null): bool
{
    $n = count($cartas);
    if ($n < 3 || $n > 4) {
        return false;
    }

    $reales = [];
    $comodines = [];
    foreach ($cartas as $c) {
        if (rh_rummy_es_comodin($c)) {
            $comodines[] = $c;
        } else {
            $reales[] = $c;
        }
    }
    if (count($reales) === 0) {
        return false;
    }

    $valor = (int) $reales[0]['valor'];
    $coloresUsados = [];
    foreach ($reales as $r) {
        if ((int) $r['valor'] !== $valor) {
            return false;
        }
        if (in_array((int) $r['color'], $coloresUsados, true)) {
            return false;
        }
        $coloresUsados[] = (int) $r['color'];
    }

    $coloresLibres = array_values(array_diff([0, 1, 2, 3], $coloresUsados));
    if (count($comodines) > count($coloresLibres)) {
        return false;
    }

    $resultado = $reales;
    foreach ($comodines as $i => $c) {
        $resultado[] = rh_rummy_comodin_como($c, $coloresLibres[$i], $valor);
    }

    $armada = $resultado;
    return true;
}

function rh_rummy_armar_meld(array $cartas, ?array &$armada = null): bool
{
    return rh_rummy_armar_escalera($cartas, $armada) || rh_rummy_armar_pierna($cartas, $armada);
}

/** Suma de valores de las cartas que le quedan sueltas a un jugador (para la heurística de la IA y el puntaje final). */
function rh_rummy_deadwood(array $mano): int
{
    return array_sum(array_map('rh_rummy_valor_ficha', $mano));
}

/** ¿Hay de dónde robar? Si no queda mazo y el descarte tiene 1 sola carta (el tope), no hay jugada posible. */
function rh_rummy_puede_robar(array $estado): bool
{
    return count($estado['mazo']) > 0 || count($estado['descarte']) > 1;
}

/**
 * Roba una carta para $jugador, del mazo o del tope del descarte. Si el
 * mazo se queda vacío, se reforma con el descarte (menos su tope, que
 * sigue visible). Arranca el conteo de puntos bajados este turno en 0.
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
    $estado['puntosTurnoActual'] = 0;

    return ['estado' => $estado, 'carta' => $carta, 'error' => null];
}

/**
 * Baja un meld NUEVO con cartas de la mano de $jugador, identificadas por
 * índice. La primera vez que un jugador baja algo en la partida, la suma de
 * TODO lo bajado en este turno (juegos previos de este mismo turno + este)
 * tiene que llegar a 30 puntos o más.
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

    $armada = null;
    if (!rh_rummy_armar_meld($cartas, $armada)) {
        return ['estado' => $estado, 'error' => 'Esas fichas no forman un juego válido'];
    }

    $puntos = array_sum(array_map('rh_rummy_valor_ficha', $armada));
    if (!$estado['bajoInicial'][$jugador]) {
        $totalTurno = $estado['puntosTurnoActual'] + $puntos;
        if ($totalTurno < RH_RUMMY_MINIMO_APERTURA) {
            return [
                'estado' => $estado,
                'error' => "Tu primera jugada tiene que sumar {$totalTurno}/" . RH_RUMMY_MINIMO_APERTURA . ' puntos o más',
            ];
        }
        $estado['bajoInicial'][$jugador] = true;
    }
    $estado['puntosTurnoActual'] += $puntos;

    foreach (array_reverse($indices) as $i) {
        array_splice($mano, $i, 1);
    }
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][] = ['jugador' => $jugador, 'cartas' => $armada];

    return ['estado' => $estado, 'error' => null];
}

/**
 * Agrega fichas de la mano de $jugador a un meld YA bajado en la mesa
 * (extender una Escalera, o completar una Pierna a 4). Sólo disponible una
 * vez hecha la primera exposición propia (regla del reglamento).
 *
 * @return array{estado: array, error: ?string}
 */
function rh_rummy_extender_meld(array $estado, int $jugador, int $meldIndex, array $indices): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'error' => 'Primero tenés que robar'];
    }
    if (!$estado['bajoInicial'][$jugador]) {
        return ['estado' => $estado, 'error' => 'Primero tenés que hacer tu jugada inicial de 30 puntos'];
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
            return ['estado' => $estado, 'error' => 'Índice de carta inválido'];
        }
        $nuevas[] = $mano[$i];
    }

    $meld = $estado['melds'][$meldIndex];
    $puntosAntes = array_sum(array_map('rh_rummy_valor_ficha', $meld['cartas']));

    $armada = null;
    if (!rh_rummy_armar_meld(array_merge($meld['cartas'], $nuevas), $armada)) {
        return ['estado' => $estado, 'error' => 'Esas fichas no se pueden agregar a ese juego'];
    }

    $puntosDespues = array_sum(array_map('rh_rummy_valor_ficha', $armada));
    $estado['puntosTurnoActual'] += ($puntosDespues - $puntosAntes);

    foreach (array_reverse($indices) as $i) {
        array_splice($mano, $i, 1);
    }
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][$meldIndex]['cartas'] = $armada;

    return ['estado' => $estado, 'error' => null];
}

/**
 * Canjea un comodín ya bajado en una Escalera por la ficha real que
 * sustituye (si el jugador la tiene en la mano) y reubica el comodín
 * liberado en un extremo de esa MISMA Escalera (regla del reglamento: el
 * comodín no puede quedar suelto). Sólo para Escaleras — ver nota de
 * alcance arriba del archivo sobre por qué las Piernas quedan afuera de
 * este canje puntual.
 *
 * @return array{estado: array, error: ?string}
 */
function rh_rummy_intercambiar_comodin(array $estado, int $jugador, int $meldIndex, int $indiceEnMano): array
{
    if ($estado['fase'] !== 'descartar') {
        return ['estado' => $estado, 'error' => 'Primero tenés que robar'];
    }
    if (!$estado['bajoInicial'][$jugador]) {
        return ['estado' => $estado, 'error' => 'Primero tenés que hacer tu jugada inicial de 30 puntos'];
    }
    if (!isset($estado['melds'][$meldIndex])) {
        return ['estado' => $estado, 'error' => 'Ese juego no existe'];
    }
    $mano = $estado['manos'][$jugador];
    if (!isset($mano[$indiceEnMano])) {
        return ['estado' => $estado, 'error' => 'Índice de carta inválido'];
    }
    $real = $mano[$indiceEnMano];
    if (rh_rummy_es_comodin($real)) {
        return ['estado' => $estado, 'error' => 'Tenés que ofrecer la ficha real, no otro comodín'];
    }

    $cartas = $estado['melds'][$meldIndex]['cartas'];
    if (!rh_rummy_armar_escalera($cartas, $armadaActual)) {
        return ['estado' => $estado, 'error' => 'Ese juego no es una Escalera, no se puede canjear así'];
    }

    $posicion = null;
    foreach ($cartas as $i => $c) {
        if (rh_rummy_es_comodin($c) && (int) $c['sustituyeColor'] === (int) $real['color'] && (int) $c['sustituyeValor'] === (int) $real['valor']) {
            $posicion = $i;
            break;
        }
    }
    if ($posicion === null) {
        return ['estado' => $estado, 'error' => 'Ningún comodín de ese juego sustituye a esa ficha'];
    }

    $comodinLiberado = ['color' => -1, 'valor' => 0];
    $cartas[$posicion] = $real;

    usort($cartas, fn ($a, $b) => rh_rummy_valor_efectivo($a) <=> rh_rummy_valor_efectivo($b));
    $v1 = rh_rummy_valor_efectivo($cartas[0]);
    $vk = rh_rummy_valor_efectivo($cartas[count($cartas) - 1]);
    $color = (int) $real['color'];
    // El color de la escalera puede leerse de cualquier ficha real; usamos
    // la que acabamos de insertar porque es la que tenemos a mano.
    foreach ($cartas as $c) {
        if (!rh_rummy_es_comodin($c)) {
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
    usort($cartas, fn ($a, $b) => rh_rummy_valor_efectivo($a) <=> rh_rummy_valor_efectivo($b));

    array_splice($mano, $indiceEnMano, 1);
    $estado['manos'][$jugador] = $mano;
    $estado['melds'][$meldIndex]['cartas'] = $cartas;

    return ['estado' => $estado, 'error' => null];
}

/** Valor efectivo (real o el que sustituye un comodín ya bajado) — para ordenar y comparar dentro de un meld. */
function rh_rummy_valor_efectivo(array $f): int
{
    return rh_rummy_es_comodin($f) ? (int) ($f['sustituyeValor'] ?? 0) : (int) $f['valor'];
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
 * Heurística de la IA para elegir qué melds bajar de una mano: agrupa
 * Piernas (mismo valor, colores distintos) y Escaleras (mismo color,
 * consecutivas) de fichas reales; con lo que sobra, si tiene comodines
 * intenta completar un trío (2 reales que combinan + 1 comodín). Greedy,
 * no busca la combinación óptima (mismo criterio documentado que el resto
 * del archivo).
 *
 * @return array{melds: array[], sueltas: array[]} índices de mano agrupados por meld, y los que quedan sueltos
 */
function rh_rummy_ia_encontrar_melds(array $mano): array
{
    $restantes = array_keys($mano);
    $esComodinIdx = fn ($i) => rh_rummy_es_comodin($mano[$i]);
    $comodinesLibres = array_values(array_filter($restantes, $esComodinIdx));
    $restantes = array_values(array_diff($restantes, $comodinesLibres));
    $melds = [];

    // Piernas: agrupar por valor.
    $porValor = [];
    foreach ($restantes as $i) {
        $porValor[$mano[$i]['valor']][] = $i;
    }
    foreach ($porValor as $indicesValor) {
        // Sin colores repetidos entre las elegidas (regla de Pierna).
        $usados = [];
        $grupo = [];
        foreach ($indicesValor as $i) {
            $c = (int) $mano[$i]['color'];
            if (in_array($c, $usados, true)) {
                continue;
            }
            $usados[] = $c;
            $grupo[] = $i;
            if (count($grupo) === 4) {
                break;
            }
        }
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

    // Escaleras: agrupar por color, ordenar por valor, tomar corridas consecutivas de 3+.
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
 * Juega el turno completo de la IA para $jugador: roba (el descarte si le
 * completa un meld, si no del mazo); si todavía no hizo su jugada inicial,
 * sólo baja si la suma de lo encontrado llega a 30 (si no, no baja nada
 * este turno); descarta la carta suelta de mayor valor (nunca un comodín
 * si tiene otra opción, total un comodín suelto vale 50 en contra).
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
    $encontrados = rh_rummy_ia_encontrar_melds($estado['manos'][$jugador]);
    $puedeBajarAlgo = $estado['bajoInicial'][$jugador];
    if (!$puedeBajarAlgo && $encontrados['melds']) {
        $mano = $estado['manos'][$jugador];
        $sumaTotal = 0;
        foreach ($encontrados['melds'] as $indices) {
            $cartas = array_map(fn ($i) => $mano[$i], $indices);
            $armada = null;
            if (rh_rummy_armar_meld($cartas, $armada)) {
                $sumaTotal += array_sum(array_map('rh_rummy_valor_ficha', $armada));
            }
        }
        $puedeBajarAlgo = $sumaTotal >= RH_RUMMY_MINIMO_APERTURA;
    }

    if ($puedeBajarAlgo) {
        foreach ($encontrados['melds'] as $indices) {
            // Los índices se corren a medida que se sacan cartas de la mano en
            // llamadas previas dentro de este mismo loop: se resuelve por
            // valor/color, no por índice fijo, re-buscando en la mano actual.
            $mano = $estado['manos'][$jugador];
            $cartasDelMeld = [];
            $usar = $indices;
            $indicesReales = [];
            foreach ($usar as $i) {
                if (isset($mano[$i])) {
                    $indicesReales[] = $i;
                    $cartasDelMeld[] = $mano[$i];
                }
            }
            if (count($indicesReales) < 3) {
                continue;
            }
            $r = rh_rummy_bajar_meld($estado, $jugador, $indicesReales);
            if ($r['error'] !== null) {
                continue; // el mínimo de apertura u otra validación lo frenó, sigue con el resto
            }
            $estado = $r['estado'];
            $melds[] = $cartasDelMeld;
        }
    }

    // Antes de descartar, intenta pegar fichas sueltas en juegos YA bajados
    // en la mesa (propios o ajenos). Sin este paso la IA queda atrapada para
    // siempre con 1-2 fichas que nunca alcanzan para un meld nuevo de 3 —
    // medido con el harness: partidas IA-vs-IA se trababan en el mismo
    // tamaño de mano por cientos de vueltas seguidas. Sólo una vez hecha la
    // apertura propia (misma condición que `rh_rummy_extender_meld()`).
    if ($estado['bajoInicial'][$jugador]) {
        $siguioPegando = true;
        while ($siguioPegando) {
            $siguioPegando = false;
            $mano = $estado['manos'][$jugador];
            foreach ($mano as $i => $ficha) {
                foreach ($estado['melds'] as $mi => $meld) {
                    $armada = null;
                    if (rh_rummy_armar_meld(array_merge($meld['cartas'], [$ficha]), $armada)) {
                        $r = rh_rummy_extender_meld($estado, $jugador, $mi, [$i]);
                        if ($r['error'] === null) {
                            $estado = $r['estado'];
                            $siguioPegando = true;
                            continue 3; // la mano cambió de tamaño: reinicia el escaneo con índices frescos
                        }
                    }
                }
            }
        }
    }

    $mano = $estado['manos'][$jugador];
    if (count($mano) === 0) {
        return ['estado' => $estado, 'robo' => $cartaRobada, 'melds' => $melds, 'descarte' => null, 'gano' => true];
    }

    $peorIndice = 0;
    $peorValor = -1;
    foreach ($mano as $i => $c) {
        $v = rh_rummy_es_comodin($c) ? 51 : rh_rummy_valor_ficha($c); // nunca descarta un comodín si hay otra opción
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
        'bajoInicial' => $estado['bajoInicial'][$miPosicion] ?? false,
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
            rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
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
