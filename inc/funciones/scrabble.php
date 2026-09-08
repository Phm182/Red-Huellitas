<?php
/**
 * HueScrabble: de 2 a 4 jugadores sobre una `JuegoSala` — mismo patrón que
 * HueRummy (`inc/funciones/rummy.php`): estado en JSON, "vista redactada"
 * por jugador (acá lo que se oculta es el atril de cada uno, no manos de
 * cartas), y las mismas piezas genéricas de `salas.php` para todo lo que no
 * es específico del juego.
 *
 * Alfabeto **moderno** (decisión ya tomada con el usuario): A-Z + Ñ, SIN las
 * fichas compuestas CH/LL/RR del set físico tradicional — una palabra se
 * arma letra por letra, sin tokenizar dígrafos. Como el set físico real
 * tiene 100 fichas CONTANDO esos 3 dígrafos (1 cada uno), sacarlos deja
 * 97 fichas (95 con letra + 2 comodines), no 100 — es aritmética, no un
 * recorte de diseño.
 *
 * Estado (`JuegoSala.Tablero`, JSON):
 * `{"tablero": [[null|{"letra":"A","valor":1,"comodin":false}, ...15], ...15],
 *   "bolsa": ["A","A","*",...], "atriles": [["A","E",...], ...],
 *   "puntajes": [n, ...], "primeraJugada": true, "pasesConsecutivos": 0,
 *   "casillasUsadas": [[7,7], ...], "jugadores": N}`.
 * `"*"` en la bolsa/atril es un comodín sin asignar; una vez jugado, la
 * letra que representa queda fija en `tablero` (con `comodin: true`, valor 0
 * para siempre, incluso releído después).
 *
 * **IA, alcance documentado (mismo criterio que `rh_rummy_ia_encontrar_melds`
 * — greedy, acotada, no óptima, a propósito):** sólo arma su palabra
 * arrancando exactamente en la casilla ancla y extendiéndose hacia
 * adelante/abajo sobre casillas vacías — nunca "engancha" una palabra nueva
 * atravesando letras ya puestas en el medio. Sigue formando cruces reales
 * con lo que ya hay en el tablero (eso lo valida y puntúa
 * `rh_scrabble_validar_y_aplicar_jugada`, igual que a un humano), sólo no
 * busca esa clase más compleja de jugada. Tope de candidatas y de tiempo
 * real acotan la búsqueda para no colgar el request.
 */

require_once __DIR__ . '/salas.php';

/**
 * Tablero de premios estándar de Scrabble (15x15, simétrico, de dominio
 * público, mismo diseño en cualquier idioma). Código por celda: '.' normal,
 * 'DL'/'TL' doble/triple letra, 'DP'/'TP' doble/triple palabra. El centro
 * (7,7) es 'DP' y además el punto de partida obligatorio de la primera
 * palabra.
 */
const RH_SCRABBLE_LAYOUT_FILAS = [
    ['TP', '.', '.', 'DL', '.', '.', '.', 'TP', '.', '.', '.', 'DL', '.', '.', 'TP'],
    ['.', 'DP', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'DP', '.'],
    ['.', '.', 'DP', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DP', '.', '.'],
    ['DL', '.', '.', 'DP', '.', '.', '.', 'DL', '.', '.', '.', 'DP', '.', '.', 'DL'],
    ['.', '.', '.', '.', 'DP', '.', '.', '.', '.', '.', 'DP', '.', '.', '.', '.'],
    ['.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.'],
    ['.', '.', 'DL', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DL', '.', '.'],
    ['TP', '.', '.', 'DL', '.', '.', '.', 'DP', '.', '.', '.', 'DL', '.', '.', 'TP'],
    ['.', '.', 'DL', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DL', '.', '.'],
    ['.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.'],
    ['.', '.', '.', '.', 'DP', '.', '.', '.', '.', '.', 'DP', '.', '.', '.', '.'],
    ['DL', '.', '.', 'DP', '.', '.', '.', 'DL', '.', '.', '.', 'DP', '.', '.', 'DL'],
    ['.', '.', 'DP', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DP', '.', '.'],
    ['.', 'DP', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'DP', '.'],
    ['TP', '.', '.', 'DL', '.', '.', '.', 'TP', '.', '.', '.', 'DL', '.', '.', 'TP'],
];

const RH_SCRABBLE_FILAS = 15;
const RH_SCRABBLE_COLS = 15;
const RH_SCRABBLE_CENTRO = 7;
const RH_SCRABBLE_FICHAS_POR_JUGADOR = 7;

/** Distribución y valor de cada letra. `cantidad`=0 para el comodín no aplica: se maneja aparte con `'*'`. */
const RH_SCRABBLE_FICHAS = [
    'A' => ['cantidad' => 12, 'valor' => 1], 'E' => ['cantidad' => 12, 'valor' => 1],
    'O' => ['cantidad' => 9, 'valor' => 1], 'I' => ['cantidad' => 6, 'valor' => 1],
    'S' => ['cantidad' => 6, 'valor' => 1], 'N' => ['cantidad' => 5, 'valor' => 1],
    'R' => ['cantidad' => 5, 'valor' => 1], 'U' => ['cantidad' => 5, 'valor' => 1],
    'L' => ['cantidad' => 4, 'valor' => 1], 'T' => ['cantidad' => 4, 'valor' => 1],
    'D' => ['cantidad' => 5, 'valor' => 2], 'G' => ['cantidad' => 2, 'valor' => 2],
    'C' => ['cantidad' => 4, 'valor' => 3], 'B' => ['cantidad' => 2, 'valor' => 3],
    'M' => ['cantidad' => 2, 'valor' => 3], 'P' => ['cantidad' => 2, 'valor' => 3],
    'H' => ['cantidad' => 2, 'valor' => 4], 'F' => ['cantidad' => 1, 'valor' => 4],
    'V' => ['cantidad' => 1, 'valor' => 4], 'Y' => ['cantidad' => 1, 'valor' => 4],
    'Q' => ['cantidad' => 1, 'valor' => 5],
    'J' => ['cantidad' => 1, 'valor' => 8], 'Ñ' => ['cantidad' => 1, 'valor' => 8], 'X' => ['cantidad' => 1, 'valor' => 8],
    'Z' => ['cantidad' => 1, 'valor' => 10],
];
const RH_SCRABBLE_COMODINES = 2;

/** '*' representa un comodín en bolsa/atril (todavía sin letra asignada). */
function rh_scrabble_bolsa_nueva(): array
{
    $bolsa = [];
    foreach (RH_SCRABBLE_FICHAS as $letra => $def) {
        for ($i = 0; $i < $def['cantidad']; $i++) {
            $bolsa[] = $letra;
        }
    }
    for ($i = 0; $i < RH_SCRABBLE_COMODINES; $i++) {
        $bolsa[] = '*';
    }
    for ($i = count($bolsa) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$bolsa[$i], $bolsa[$j]] = [$bolsa[$j], $bolsa[$i]];
    }
    return $bolsa;
}

/** Valor de una letra ya jugada (comodín siempre 0, sea cual sea la letra que representa). */
function rh_scrabble_valor_letra(string $letra): int
{
    if ($letra === '*') {
        return 0;
    }
    return RH_SCRABBLE_FICHAS[$letra]['valor'] ?? 0;
}

/** Igual convención que `rh_ludo_inicial()`/`rh_rummy_inicial()`: devuelve el JSON ya codificado, listo para `JuegoSala.Tablero`. */
function rh_scrabble_inicial(int $jugadores): string
{
    $bolsa = rh_scrabble_bolsa_nueva();
    $atriles = [];
    for ($j = 0; $j < $jugadores; $j++) {
        $atril = [];
        for ($f = 0; $f < RH_SCRABBLE_FICHAS_POR_JUGADOR; $f++) {
            if ($bolsa) {
                $atril[] = array_pop($bolsa);
            }
        }
        $atriles[] = $atril;
    }

    $tableroVacio = array_fill(0, RH_SCRABBLE_FILAS, null);
    foreach ($tableroVacio as $f => $_) {
        $tableroVacio[$f] = array_fill(0, RH_SCRABBLE_COLS, null);
    }

    return json_encode([
        'tablero' => $tableroVacio,
        'bolsa' => $bolsa,
        'atriles' => $atriles,
        'puntajes' => array_fill(0, $jugadores, 0),
        'primeraJugada' => true,
        'pasesConsecutivos' => 0,
        'casillasUsadas' => [],
        'jugadores' => $jugadores,
    ]);
}

/** Vista segura para el jugador `$miPosicion`: nunca expone el atril ajeno ni el contenido de la bolsa. */
function rh_scrabble_estado_visible(array $estado, int $miPosicion): array
{
    $cantidadPorJugador = [];
    foreach ($estado['atriles'] as $posicion => $atril) {
        $cantidadPorJugador[$posicion] = count($atril);
    }

    return [
        'tablero' => $estado['tablero'],
        'miAtril' => $estado['atriles'][$miPosicion] ?? [],
        'cantidadFichasPorJugador' => $cantidadPorJugador,
        'fichasEnBolsa' => count($estado['bolsa']),
        'puntajes' => $estado['puntajes'],
        'primeraJugada' => $estado['primeraJugada'],
        'pasesConsecutivos' => $estado['pasesConsecutivos'],
        'jugadores' => $estado['jugadores'],
    ];
}

/** ¿Existe esa palabra en el diccionario? (ya en mayúsculas, sin tildes). */
function rh_scrabble_palabra_valida(mysqli $conn, string $palabra): bool
{
    $stmt = $conn->prepare('SELECT 1 FROM ScrabbleDiccionario WHERE Palabra = ?');
    $stmt->bind_param('s', $palabra);
    $stmt->execute();
    $existe = $stmt->get_result()->fetch_assoc() !== null;
    $stmt->close();
    return $existe;
}

/** Valida varias de una, para no ir palabra por palabra a la base en un solo turno. */
function rh_scrabble_palabras_validas(mysqli $conn, array $palabras): array
{
    $palabras = array_values(array_unique($palabras));
    if (!$palabras) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($palabras), '?'));
    $stmt = $conn->prepare("SELECT Palabra FROM ScrabbleDiccionario WHERE Palabra IN ($placeholders)");
    $stmt->bind_param(str_repeat('s', count($palabras)), ...$palabras);
    $stmt->execute();
    $res = $stmt->get_result();
    $validas = [];
    foreach ($palabras as $p) {
        $validas[$p] = false;
    }
    while ($fila = $res->fetch_assoc()) {
        $validas[$fila['Palabra']] = true;
    }
    $stmt->close();
    return $validas;
}

function rh_scrabble_en_rango(int $fila, int $col): bool
{
    return $fila >= 0 && $fila < RH_SCRABBLE_FILAS && $col >= 0 && $col < RH_SCRABBLE_COLS;
}

/**
 * La corrida contigua máxima de celdas ocupadas (en `$tableroConNuevas`,
 * que ya incluye las fichas recién colocadas) que pasa por (fila,col), en
 * una dirección. Devuelve null si esa celda queda sola (corrida de largo 1).
 *
 * @return array{inicio:array{fila:int,col:int}, celdas: list<array{fila:int,col:int}>}|null
 */
function rh_scrabble_corrida(array $tableroConNuevas, int $fila, int $col, bool $horizontal): ?array
{
    $df = $horizontal ? 0 : 1;
    $dc = $horizontal ? 1 : 0;

    $f = $fila;
    $c = $col;
    while (rh_scrabble_en_rango($f - $df, $c - $dc) && $tableroConNuevas[$f - $df][$c - $dc] !== null) {
        $f -= $df;
        $c -= $dc;
    }

    $celdas = [];
    while (rh_scrabble_en_rango($f, $c) && $tableroConNuevas[$f][$c] !== null) {
        $celdas[] = ['fila' => $f, 'col' => $c];
        $f += $df;
        $c += $dc;
    }

    if (count($celdas) < 2) {
        return null;
    }
    return ['inicio' => $celdas[0], 'celdas' => $celdas];
}

/**
 * El corazón del juego: valida una jugada completa y, si es válida, la
 * aplica sobre una COPIA de `$estado` (nunca toca el original si algo
 * falla). `$fichasColocadas` es `[{fila,col,letra,esComodin}]` — sólo las
 * fichas NUEVAS de este turno, nunca las que ya estaban puestas.
 *
 * @return array{estado: array, puntos: int, palabras: list<array{palabra:string,puntos:int}>, error: ?string}
 */
function rh_scrabble_validar_y_aplicar_jugada(mysqli $conn, array $estado, int $posicion, array $fichasColocadas): array
{
    $error = fn (string $m) => ['estado' => $estado, 'puntos' => 0, 'palabras' => [], 'error' => $m];

    if (!$fichasColocadas) {
        return $error('No colocaste ninguna ficha');
    }

    $atril = $estado['atriles'][$posicion] ?? null;
    if ($atril === null) {
        return $error('Ese asiento no existe');
    }

    // --- 1) Forma básica: dentro del tablero, sin pisar casillas ocupadas, sin repetir posición.
    $vistas = [];
    foreach ($fichasColocadas as $f) {
        $fila = (int) $f['fila'];
        $col = (int) $f['col'];
        if (!rh_scrabble_en_rango($fila, $col)) {
            return $error('Esa casilla no existe');
        }
        $clave = "$fila,$col";
        if (isset($vistas[$clave])) {
            return $error('No podés poner dos fichas en la misma casilla');
        }
        $vistas[$clave] = true;
        if ($estado['tablero'][$fila][$col] !== null) {
            return $error('Esa casilla ya tiene una ficha');
        }
    }

    // --- 2) Todas en la misma fila o en la misma columna (si hay más de una).
    if (count($fichasColocadas) > 1) {
        $filas = array_unique(array_map(fn ($f) => (int) $f['fila'], $fichasColocadas));
        $cols = array_unique(array_map(fn ($f) => (int) $f['col'], $fichasColocadas));
        if (count($filas) > 1 && count($cols) > 1) {
            return $error('Las fichas tienen que ir en una sola línea, horizontal o vertical');
        }
    }

    // --- 3) El atril tiene lo que se está por jugar.
    $atrilDisponible = $atril;
    foreach ($fichasColocadas as $f) {
        $esComodin = !empty($f['esComodin']);
        $buscar = $esComodin ? '*' : mb_strtoupper((string) $f['letra']);
        $idx = array_search($buscar, $atrilDisponible, true);
        if ($idx === false) {
            return $error($esComodin ? 'No te queda ningún comodín' : "No tenés la ficha $buscar en tu atril");
        }
        unset($atrilDisponible[$idx]);
    }

    // --- 4) Tablero temporal con las fichas nuevas puestas, para reconstruir palabras.
    $tableroNuevo = $estado['tablero'];
    foreach ($fichasColocadas as $f) {
        $letra = mb_strtoupper((string) $f['letra']);
        $esComodin = !empty($f['esComodin']);
        $tableroNuevo[(int) $f['fila']][(int) $f['col']] = [
            'letra' => $letra,
            'valor' => $esComodin ? 0 : rh_scrabble_valor_letra($letra),
            'comodin' => $esComodin,
        ];
    }

    // --- 5) Primera jugada: tiene que cubrir el centro.
    if ($estado['primeraJugada']) {
        $cubreCentro = false;
        foreach ($fichasColocadas as $f) {
            if ((int) $f['fila'] === RH_SCRABBLE_CENTRO && (int) $f['col'] === RH_SCRABBLE_CENTRO) {
                $cubreCentro = true;
                break;
            }
        }
        if (!$cubreCentro) {
            return $error('La primera palabra tiene que pasar por el centro del tablero');
        }
    }

    // --- 6) Sin huecos: entre los extremos de la línea jugada, cada celda está ocupada.
    if (count($fichasColocadas) > 1) {
        $horiz = count(array_unique(array_map(fn ($f) => (int) $f['fila'], $fichasColocadas))) === 1;
        if ($horiz) {
            $fila = (int) $fichasColocadas[0]['fila'];
            $cols = array_map(fn ($f) => (int) $f['col'], $fichasColocadas);
            for ($c = min($cols); $c <= max($cols); $c++) {
                if ($tableroNuevo[$fila][$c] === null) {
                    return $error('Dejaste un hueco en el medio de la palabra');
                }
            }
        } else {
            $col = (int) $fichasColocadas[0]['col'];
            $filas = array_map(fn ($f) => (int) $f['fila'], $fichasColocadas);
            for ($f = min($filas); $f <= max($filas); $f++) {
                if ($tableroNuevo[$f][$col] === null) {
                    return $error('Dejaste un hueco en el medio de la palabra');
                }
            }
        }
    }

    // --- 7) Reconstruir TODAS las palabras formadas (línea principal + cruces),
    //     dedupe por span para no contar la misma dos veces.
    $palabrasVistas = [];
    $palabras = []; // clave => ['celdas' => [...], 'texto' => string]
    foreach ($fichasColocadas as $f) {
        $fila = (int) $f['fila'];
        $col = (int) $f['col'];
        foreach ([true, false] as $horizontal) {
            $corrida = rh_scrabble_corrida($tableroNuevo, $fila, $col, $horizontal);
            if ($corrida === null) {
                continue;
            }
            $clave = ($horizontal ? 'H' : 'V') . ':' . $corrida['inicio']['fila'] . ',' . $corrida['inicio']['col'];
            if (isset($palabrasVistas[$clave])) {
                continue;
            }
            $palabrasVistas[$clave] = true;
            $texto = '';
            foreach ($corrida['celdas'] as $celda) {
                $texto .= $tableroNuevo[$celda['fila']][$celda['col']]['letra'];
            }
            $palabras[] = ['celdas' => $corrida['celdas'], 'texto' => $texto];
        }
    }

    if (!$palabras) {
        return $error('Esa jugada no forma ninguna palabra');
    }

    // --- 8) Conectividad (no aplica en la primera jugada, ya se exigió pasar por el centro):
    //     alguna palabra formada tiene que incluir al menos una ficha que YA estaba puesta.
    if (!$estado['primeraJugada']) {
        $conecta = false;
        foreach ($palabras as $p) {
            foreach ($p['celdas'] as $celda) {
                if ($estado['tablero'][$celda['fila']][$celda['col']] !== null) {
                    $conecta = true;
                    break 2;
                }
            }
        }
        if (!$conecta) {
            return $error('Tiene que conectar con una ficha ya puesta en el tablero');
        }
    }

    // --- 9) Diccionario: cada palabra de 2+ letras tiene que ser válida.
    $validas = rh_scrabble_palabras_validas($conn, array_column($palabras, 'texto'));
    foreach ($palabras as $p) {
        if (!($validas[$p['texto']] ?? false)) {
            return $error('"' . $p['texto'] . '" no es una palabra válida');
        }
    }

    // --- 10) Puntaje. Los multiplicadores de casilla sólo cuentan si esa celda
    //     es NUEVA este turno y todavía no fue usada antes.
    $casillasUsadasAntes = [];
    foreach ($estado['casillasUsadas'] as [$cf, $cc]) {
        $casillasUsadasAntes["$cf,$cc"] = true;
    }
    $esNueva = fn (int $fila, int $col) => $estado['tablero'][$fila][$col] === null;
    $premioLibre = fn (int $fila, int $col) => $esNueva($fila, $col) && !isset($casillasUsadasAntes["$fila,$col"]);

    $palabrasConPuntos = [];
    $puntosTotal = 0;
    foreach ($palabras as $p) {
        $sumaLetras = 0;
        $multPalabra = 1;
        foreach ($p['celdas'] as $celda) {
            $ficha = $tableroNuevo[$celda['fila']][$celda['col']];
            $valorLetra = $ficha['valor'];
            $premio = RH_SCRABBLE_LAYOUT_FILAS[$celda['fila']][$celda['col']];
            if ($premioLibre($celda['fila'], $celda['col'])) {
                if ($premio === 'DL') {
                    $valorLetra *= 2;
                } elseif ($premio === 'TL') {
                    $valorLetra *= 3;
                } elseif ($premio === 'DP') {
                    $multPalabra *= 2;
                } elseif ($premio === 'TP') {
                    $multPalabra *= 3;
                }
            }
            $sumaLetras += $valorLetra;
        }
        $puntosPalabra = $sumaLetras * $multPalabra;
        $palabrasConPuntos[] = ['palabra' => $p['texto'], 'puntos' => $puntosPalabra];
        $puntosTotal += $puntosPalabra;
    }

    // Bono de "usar las 7 fichas del atril en un turno", sumado DESPUÉS de
    // aplicar los multiplicadores de cada palabra.
    if (count($fichasColocadas) === RH_SCRABBLE_FICHAS_POR_JUGADOR) {
        $puntosTotal += 50;
    }

    // --- 11) Todo validado: aplicar sobre la copia.
    $estado['tablero'] = $tableroNuevo;
    foreach ($fichasColocadas as $f) {
        $fila = (int) $f['fila'];
        $col = (int) $f['col'];
        if (!isset($casillasUsadasAntes["$fila,$col"]) && RH_SCRABBLE_LAYOUT_FILAS[$fila][$col] !== '.') {
            $estado['casillasUsadas'][] = [$fila, $col];
        }
    }

    $nuevoAtril = array_values($atrilDisponible);
    $bolsa = $estado['bolsa'];
    while (count($nuevoAtril) < RH_SCRABBLE_FICHAS_POR_JUGADOR && $bolsa) {
        $nuevoAtril[] = array_pop($bolsa);
    }
    $estado['bolsa'] = $bolsa;
    $estado['atriles'][$posicion] = $nuevoAtril;
    $estado['puntajes'][$posicion] += $puntosTotal;
    $estado['primeraJugada'] = false;
    $estado['pasesConsecutivos'] = 0;

    return ['estado' => $estado, 'puntos' => $puntosTotal, 'palabras' => $palabrasConPuntos, 'error' => null];
}

/** Sólo pasa el turno: no toca fichas ni tablero. El caller decide si esto termina el juego. */
function rh_scrabble_pasar(array $estado, int $posicion): array
{
    $estado['pasesConsecutivos']++;
    return $estado;
}

/**
 * Cambia fichas del atril por otras nuevas de la bolsa. Cuenta como un turno
 * real (resetea `pasesConsecutivos` a 0) — a diferencia de pasar, que lo
 * incrementa. Sólo permitido si queda algo en la bolsa.
 *
 * @return array{estado: array, error: ?string}
 */
function rh_scrabble_intercambiar(array $estado, int $posicion, array $indices): array
{
    if (!$estado['bolsa']) {
        return ['estado' => $estado, 'error' => 'No queda nada en la bolsa para cambiar fichas'];
    }
    $atril = $estado['atriles'][$posicion] ?? null;
    if ($atril === null) {
        return ['estado' => $estado, 'error' => 'Ese asiento no existe'];
    }
    $indices = array_values(array_unique(array_map('intval', $indices)));
    if (!$indices) {
        return ['estado' => $estado, 'error' => 'Elegí al menos una ficha para cambiar'];
    }
    foreach ($indices as $i) {
        if (!isset($atril[$i])) {
            return ['estado' => $estado, 'error' => 'Índice de ficha inválido'];
        }
    }

    $devueltas = [];
    foreach ($indices as $i) {
        $devueltas[] = $atril[$i];
    }
    foreach (array_reverse($indices) as $i) {
        array_splice($atril, $i, 1);
    }

    $bolsa = array_merge($estado['bolsa'], $devueltas);
    for ($i = count($bolsa) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$bolsa[$i], $bolsa[$j]] = [$bolsa[$j], $bolsa[$i]];
    }
    foreach ($indices as $_) {
        if ($bolsa) {
            $atril[] = array_pop($bolsa);
        }
    }

    $estado['bolsa'] = $bolsa;
    $estado['atriles'][$posicion] = array_values($atril);
    $estado['pasesConsecutivos'] = 0;

    return ['estado' => $estado, 'error' => null];
}

/** Bolsa vacía y algún atril en 0, o todos pasaron dos veces seguidas. */
function rh_scrabble_terminado(array $estado): bool
{
    if ($estado['pasesConsecutivos'] >= $estado['jugadores'] * 2) {
        return true;
    }
    if (count($estado['bolsa']) > 0) {
        return false;
    }
    foreach ($estado['atriles'] as $atril) {
        if (count($atril) === 0) {
            return true;
        }
    }
    return false;
}

/**
 * Puntaje final por posición: a cada uno se le resta el valor de lo que le
 * quedó en el atril; si alguien vació el suyo, se le suma lo que perdieron
 * los demás (regla clásica de cierre de Scrabble).
 *
 * @return array<int,int> posición => puntaje final
 */
function rh_scrabble_puntajes_finales(array $estado): array
{
    $huboVaciado = false;
    $posicionVaciada = null;
    foreach ($estado['atriles'] as $pos => $atril) {
        if (count($atril) === 0) {
            $huboVaciado = true;
            $posicionVaciada = $pos;
        }
    }

    $ajustes = [];
    $sumaSobrante = 0;
    foreach ($estado['atriles'] as $pos => $atril) {
        $valor = array_sum(array_map('rh_scrabble_valor_letra', $atril));
        $ajustes[$pos] = -$valor;
        $sumaSobrante += $valor;
    }
    if ($huboVaciado && $posicionVaciada !== null) {
        $ajustes[$posicionVaciada] += $sumaSobrante;
    }

    $finales = [];
    foreach ($estado['puntajes'] as $pos => $p) {
        $finales[$pos] = max(0, $p + ($ajustes[$pos] ?? 0));
    }
    return $finales;
}

// ------------------------------------------------------------------
// IA: acotada y greedy — ver el comentario de cabecera del archivo.
// ------------------------------------------------------------------

const RH_SCRABBLE_IA_TOPE_CANDIDATAS = 300;
const RH_SCRABBLE_IA_TOPE_SEGUNDOS = 3.0;

/** Casillas vacías pegadas a alguna ya ocupada — de ahí puede arrancar una palabra nueva. */
function rh_scrabble_anclas(array $tablero): array
{
    $anclas = [];
    for ($f = 0; $f < RH_SCRABBLE_FILAS; $f++) {
        for ($c = 0; $c < RH_SCRABBLE_COLS; $c++) {
            if ($tablero[$f][$c] !== null) {
                continue;
            }
            foreach ([[-1, 0], [1, 0], [0, -1], [0, 1]] as [$df, $dc]) {
                $vf = $f + $df;
                $vc = $c + $dc;
                if (rh_scrabble_en_rango($vf, $vc) && $tablero[$vf][$vc] !== null) {
                    $anclas[] = ['fila' => $f, 'col' => $c];
                    break;
                }
            }
        }
    }
    return $anclas;
}

/**
 * Genera permutaciones de subconjuntos del atril (largo 2..N), llamando a
 * `$onCandidata` con cada una — corta sola si `$presupuesto` (por
 * referencia) llega a 0. Cada elemento de una permutación es `{letra,
 * esComodin}` (un comodín puede representar cualquier letra A-ZÑ, así que
 * se prueba como cada letra posible, no como un símbolo aparte).
 */
function rh_scrabble_ia_generar_permutaciones(array $atril, int $largoMax, int &$presupuesto, callable $onCandidata): void
{
    // Alfabeto real (con Ñ) para desdoblar comodines.
    $alfabeto = array_keys(RH_SCRABBLE_FICHAS);

    $indices = array_keys($atril);
    $largoMax = min($largoMax, count($indices));

    $permutar = function (array $disponibles, array $actual) use (&$permutar, &$presupuesto, $onCandidata, $atril, $alfabeto, $largoMax) {
        if ($presupuesto <= 0) {
            return;
        }
        if (count($actual) >= 2) {
            $presupuesto--;
            $onCandidata($actual);
            if ($presupuesto <= 0) {
                return;
            }
        }
        if (count($actual) >= $largoMax) {
            return;
        }
        foreach ($disponibles as $k => $i) {
            $restantes = $disponibles;
            unset($restantes[$k]);
            $letraAtril = $atril[$i];
            if ($letraAtril === '*') {
                // Comodín: probar unas pocas letras frecuentes alcanza para
                // que la IA encuentre algo razonable sin explotar el árbol
                // de búsqueda con las ~27 posibilidades por cada comodín.
                foreach (['A', 'E', 'O', 'S', 'N', 'R'] as $letraProbada) {
                    if ($presupuesto <= 0) {
                        return;
                    }
                    $permutar($restantes, [...$actual, ['letra' => $letraProbada, 'esComodin' => true]]);
                }
            } else {
                $permutar($restantes, [...$actual, ['letra' => $letraAtril, 'esComodin' => false]]);
            }
        }
    };

    $permutar($indices, []);
}

/**
 * Busca la mejor jugada dentro del presupuesto de candidatas/tiempo. `null`
 * si no encontró ninguna válida.
 *
 * @return array{fichasColocadas: array, puntos: int, palabras: array}|null
 */
function rh_scrabble_ia_elegir_jugada(mysqli $conn, array $estado, int $posicion): ?array
{
    $atril = $estado['atriles'][$posicion] ?? [];
    if (!$atril) {
        return null;
    }

    $inicio = microtime(true);
    $presupuesto = RH_SCRABBLE_IA_TOPE_CANDIDATAS;
    $mejor = null;
    $mejorPuntos = -1;

    $anclas = $estado['primeraJugada']
        ? [['fila' => RH_SCRABBLE_CENTRO, 'col' => RH_SCRABBLE_CENTRO]]
        : rh_scrabble_anclas($estado['tablero']);

    foreach ($anclas as $ancla) {
        if ($presupuesto <= 0 || (microtime(true) - $inicio) > RH_SCRABBLE_IA_TOPE_SEGUNDOS) {
            break;
        }
        foreach ([true, false] as $horizontal) {
            if ($presupuesto <= 0 || (microtime(true) - $inicio) > RH_SCRABBLE_IA_TOPE_SEGUNDOS) {
                break;
            }

            // Cuánto lugar hay para extender hacia adelante/abajo desde el
            // ancla, sin pisar una celda ya ocupada (limitación documentada:
            // la IA no "engancha" a través de letras existentes).
            $maxLargo = 0;
            $f = $ancla['fila'];
            $c = $ancla['col'];
            while (rh_scrabble_en_rango($f, $c) && $estado['tablero'][$f][$c] === null) {
                $maxLargo++;
                $f += $horizontal ? 0 : 1;
                $c += $horizontal ? 1 : 0;
            }
            if ($maxLargo < 2) {
                continue;
            }

            rh_scrabble_ia_generar_permutaciones(
                $atril,
                min($maxLargo, RH_SCRABBLE_FICHAS_POR_JUGADOR),
                $presupuesto,
                function (array $candidata) use (
                    $conn, $estado, $posicion, $ancla, $horizontal, &$mejor, &$mejorPuntos
                ) {
                    $fichasColocadas = [];
                    foreach ($candidata as $k => $letraInfo) {
                        $fichasColocadas[] = [
                            'fila' => $ancla['fila'] + ($horizontal ? 0 : $k),
                            'col' => $ancla['col'] + ($horizontal ? $k : 0),
                            'letra' => $letraInfo['letra'],
                            'esComodin' => $letraInfo['esComodin'],
                        ];
                    }
                    $resultado = rh_scrabble_validar_y_aplicar_jugada($conn, $estado, $posicion, $fichasColocadas);
                    if ($resultado['error'] === null && $resultado['puntos'] > $mejorPuntos) {
                        $mejorPuntos = $resultado['puntos'];
                        $mejor = [
                            'fichasColocadas' => $fichasColocadas,
                            'puntos' => $resultado['puntos'],
                            'palabras' => $resultado['palabras'],
                        ];
                    }
                }
            );
        }
    }

    return $mejor;
}

/**
 * Mientras a quien le toca jugar sea un asiento de IA, le juega el turno
 * completo (jugar si encontró algo, si no cambiar fichas, si no pasar) y
 * pasa al siguiente — mismo patrón que `rh_rummy_sala_resolver_ia_en_cadena()`.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_scrabble_sala_resolver_ia_en_cadena(mysqli $conn, array $sala, array $jugadores): array
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

        $jugada = rh_scrabble_ia_elegir_jugada($conn, $estado, $posicion);
        if ($jugada !== null) {
            $resultado = rh_scrabble_validar_y_aplicar_jugada($conn, $estado, $posicion, $jugada['fichasColocadas']);
            $estado = $resultado['estado'];
            $jugadasIA[] = [
                'salaJugadorId' => (int) $actual['SalaJugadorId'],
                'tipo' => 'jugada',
                'fichasColocadas' => $jugada['fichasColocadas'],
                'palabras' => $resultado['palabras'],
                'puntos' => $resultado['puntos'],
            ];
        } elseif ($estado['bolsa']) {
            // Sin jugada encontrada: cambia toda la mano.
            $indices = array_keys($estado['atriles'][$posicion]);
            $r = rh_scrabble_intercambiar($estado, $posicion, $indices);
            $estado = $r['estado'];
            $jugadasIA[] = ['salaJugadorId' => (int) $actual['SalaJugadorId'], 'tipo' => 'intercambio'];
        } else {
            $estado = rh_scrabble_pasar($estado, $posicion);
            $jugadasIA[] = ['salaJugadorId' => (int) $actual['SalaJugadorId'], 'tipo' => 'paso'];
        }

        $tableroJson = json_encode($estado);
        $stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
        $stmt->bind_param('si', $tableroJson, $salaId);
        $stmt->execute();
        $stmt->close();

        if (rh_scrabble_terminado($estado)) {
            $finales = rh_scrabble_puntajes_finales($estado);
            $ganadorPos = null;
            $mejorPuntaje = -1;
            $empatado = false;
            foreach ($finales as $pos => $p) {
                if ($p > $mejorPuntaje) {
                    $mejorPuntaje = $p;
                    $ganadorPos = $pos;
                    $empatado = false;
                } elseif ($p === $mejorPuntaje) {
                    $empatado = true;
                }
            }
            $puntosPorAsiento = [];
            $ganadorSalaJugadorId = null;
            foreach ($jugadores as $j) {
                $pos = (int) $j['Posicion'];
                $puntosPorAsiento[(int) $j['SalaJugadorId']] = $finales[$pos] ?? 0;
                if (!$empatado && $pos === $ganadorPos) {
                    $ganadorSalaJugadorId = (int) $j['SalaJugadorId'];
                }
            }
            rh_sala_cerrar($conn, $sala, $jugadores, $ganadorSalaJugadorId, $puntosPorAsiento);
            $sala = rh_sala_obtener($conn, $salaId);
            break;
        }

        $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
        $siguiente = rh_sala_siguiente_jugador($activos, $posicion);
        if ($siguiente !== null) {
            rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoMinutos']);
        }

        $sala = rh_sala_obtener($conn, $salaId);
    }

    return ['sala' => $sala, 'jugadores' => rh_sala_jugadores($conn, $salaId), 'jugadasIA' => $jugadasIA];
}

/**
 * Punto de entrada único para dejar una sala de HueScrabble al día antes de
 * mostrarla o de jugar. Espejo de `rh_rummy_sala_actualizar()`.
 *
 * @return array{sala: array, jugadores: array[], jugadasIA: array[]}
 */
function rh_scrabble_sala_actualizar(mysqli $conn, array $sala): array
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

    return rh_scrabble_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
}
