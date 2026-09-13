<?php
/**
 * HuePlay: puntaje por usuario, niveles y desafíos.
 *
 * Este archivo es la única puerta por donde entran puntos. Cualquier juego
 * nuevo llama a `rh_juego_registrar_partida()` y hereda nivel, ranking y
 * desafíos sin escribir nada de esto de nuevo.
 */

require_once __DIR__ . '/notificaciones.php';

/**
 * Juegos habilitados.
 *
 * `maxPuntos` es el techo de una partida honesta, y existe porque **el puntaje
 * lo calcula el cliente**: el tablero se juega en el celular y el servidor sólo
 * recibe el número final. Revalidar de verdad exigiría reproducir la partida
 * jugada a jugada en PHP, que es muchísimo más código y aún así se puede
 * simular. El techo no impide hacer trampa, pero sí impide que una trampa
 * arruine el ranking para todos: lo peor que se puede reclamar es una partida
 * muy buena, no un millón de puntos.
 *
 * `minSegundos` es la duración mínima creíble; sirve contra el script que
 * dispara partidas en loop.
 */
const RH_JUEGOS = [
    // 'puntaje': cada uno juega su partida y se comparan los números.
    'huematch' => ['modo' => 'puntaje', 'maxPuntos' => 6000, 'minSegundos' => 15],
    // Una partida perfecta de HueMemo da ~1880 (800 por pares + 600 de
    // eficiencia + hasta 480 de tiempo). El techo deja margen y corta lo demás.
    'huememo' => ['modo' => 'puntaje', 'maxPuntos' => 2200, 'minSegundos' => 8],
    // Puntaje pensado para que gane ESTRICTAMENTE el más rápido (ver
    // huezip/motor.ts::puntaje) — 5000 es el techo exacto de la fórmula
    // (0 segundos, 0 reinicios), no un margen arbitrario. Por eso
    // `minSegundos` tiene que ser MUY bajo acá y no un piso "razonable" como
    // en el resto de la tabla: el propio diseño del puntaje premia terminar
    // rapidísimo, así que con 8 (el valor viejo) una partida buena de
    // verdad — la que el juego está pensado para premiar — se rechazaba
    // sola como "Partida inválida". Bug real reportado, pasaba seguido.
    'huezip' => ['modo' => 'puntaje', 'maxPuntos' => 5000, 'minSegundos' => 2],
    // 'turnos': un solo tablero que los dos van modificando. Acá `maxPuntos` no
    // aplica porque el puntaje lo pone el servidor, no el cliente.
    'hueconecta' => ['modo' => 'turnos'],
    'huedamas' => ['modo' => 'turnos'],
    'hueajedrez' => ['modo' => 'turnos'],
    'huereversi' => ['modo' => 'turnos'],
    'huetateti' => ['modo' => 'turnos'],
    'huepool' => ['modo' => 'turnos'],
    // HueSoccer también es 'turnos': el tablero (posiciones de fichas/pelota)
    // lo va escribiendo el que tira, un tiro por turno — ver inc/funciones/soccer.php.
    'huesoccer' => ['modo' => 'turnos'],
    // 'sala': hasta 4 jugadores sobre `JuegoSala`/`JuegoSalaJugador`, no
    // `JuegoDesafio` — el puntaje también lo pone el servidor.
    'hueludo' => ['modo' => 'sala'],
    'hueludoroyal' => ['modo' => 'sala'],
    'huerummy' => ['modo' => 'sala'],
    'hueburako' => ['modo' => 'sala'],
    'huescrabble' => ['modo' => 'sala'],
    // HueTrivia tampoco necesita techo: el puntaje lo calcula el servidor a
    // partir de las respuestas, el cliente no informa ningún número.
    'huetrivia' => ['modo' => 'puntaje', 'maxPuntos' => 3000, 'minSegundos' => 0],
    // HueDoku: 3 variantes = 3 juegoCodigo, cada una con su propio ranking
    // (nunca compiten entre sí). Mismo criterio de "gana el más rápido" que
    // HueZip (ver huedoku/motor.ts::puntaje), techo 3000 = 0s/0 errores. Los
    // pisos de minSegundos son conservadores por variante (no revalidan la
    // partida jugada a jugada, igual criterio que el resto del catálogo).
    'huedoku6' => ['modo' => 'puntaje', 'maxPuntos' => 3000, 'minSegundos' => 10],
    'huedoku9facil' => ['modo' => 'puntaje', 'maxPuntos' => 3000, 'minSegundos' => 45],
    'huedoku9dificil' => ['modo' => 'puntaje', 'maxPuntos' => 3000, 'minSegundos' => 90],
    // HuePacMan: único juego en tiempo real del catálogo (los demás son por
    // turnos o puzzles con semilla) — igual entra en 'puntaje' sin cambiar
    // nada de este mecanismo, el cliente informa un número al final como
    // cualquier otro. Techo calculado a mano desde `src/juego/huepacman/motor.ts`:
    // 145 puntos*10 + 4 pellets*50 + comerse los 3 fantasmas en las 4
    // rachas de power-pellet (200+400+800 cada una) = 7250 en una corrida
    // perfecta; el margen extra es el mismo criterio "generoso, no exacto"
    // del resto de la tabla.
    'huepacman' => ['modo' => 'puntaje', 'maxPuntos' => 7500, 'minSegundos' => 20],
    // HueTetris/HueColumns: juegos SIN FIN natural (suben de nivel con el
    // tiempo hasta que se pierde) — no hay una "corrida perfecta" contra la
    // que calcular un techo exacto como el resto de la tabla.
    // `rh_juego_puntaje_valido()` sólo RECORTA al techo (no rechaza), así
    // que un techo generoso no bloquea a nadie: sólo hace falta que ningún
    // valor real de una sesión lo alcance. `minSegundos` en cambio sí
    // importa: bloquea un envío con 0 duración de un cliente corrupto.
    'huetetris' => ['modo' => 'puntaje', 'maxPuntos' => 999999, 'minSegundos' => 15],
    'huecolumns' => ['modo' => 'puntaje', 'maxPuntos' => 999999, 'minSegundos' => 15],
    // HueGotchi no se juega por partidas: suma de a poco con cada acción de
    // cuidado. No se puede retar, y el puntaje lo pone el servidor.
    'huegotchi' => ['modo' => 'cuidado', 'maxPuntos' => 100, 'minSegundos' => 0],
];

/**
 * Puntos acumulados en UN juego.
 *
 * Se calcula sumando `JuegoPartida` en vez de guardarlo en una columna: es una
 * consulta sobre un índice que ya existe, y evita tener un total que se pueda
 * desincronizar del historial que lo respalda.
 */
function rh_juego_puntos_de(mysqli $conn, int $userId, string $codigo): int
{
    $stmt = $conn->prepare(
        'SELECT COALESCE(SUM(Puntos), 0) AS Total FROM JuegoPartida WHERE UserId = ? AND JuegoCodigo = ?'
    );
    $stmt->bind_param('is', $userId, $codigo);
    $stmt->execute();
    $t = (int) ($stmt->get_result()->fetch_assoc()['Total'] ?? 0);
    $stmt->close();
    return $t;
}

/**
 * Nivel dentro de un juego.
 *
 * Misma forma que el nivel de cuenta pero con la mitad de costo: el nivel L
 * necesita 25*(L-1)^2 puntos en ese juego, contra 50*(L-1)^2 del total.
 *
 * La relación entre los dos es a propósito. El nivel de cuenta suma TODOS los
 * juegos, así que siempre va por delante de cualquiera de los individuales;
 * leerlo tiene sentido ("nivel 12 de cuenta, nivel 8 en HueMatch"). Y como cada
 * juego arranca de cero, la curva más barata hace que se note el progreso
 * enseguida al probar uno nuevo, en vez de quedarse clavado en nivel 1.
 */
function rh_juego_nivel_juego(int $puntos): int
{
    if ($puntos < 25) {
        return 1;
    }
    return min((int) floor(sqrt($puntos / 25)) + 1, 99);
}

/** Progreso dentro de un juego, con la misma forma que `rh_juego_progreso()`. */
function rh_juego_progreso_juego(int $puntos): array
{
    $nivel = rh_juego_nivel_juego($puntos);
    return [
        'nivel' => $nivel,
        'puntos' => $puntos,
        'nivelDesde' => 25 * ($nivel - 1) ** 2,
        'nivelHasta' => 25 * $nivel ** 2,
        'faltan' => max(0, 25 * $nivel ** 2 - $puntos),
    ];
}

function rh_juego_modo(string $codigo): string
{
    return RH_JUEGOS[$codigo]['modo'] ?? 'puntaje';
}

/**
 * Nombre visible de un juego, para los textos de notificación.
 *
 * Vive acá y no en cada endpoint porque el nombre aparece en varios avisos, y
 * tenerlo escrito a mano en cada uno garantiza que al sumar un juego alguno
 * quede diciendo "HueCrush" para todos.
 */
function rh_juego_titulo(string $codigo): string
{
    $nombres = [
        'huematch' => 'HueCrush',
        'hueconecta' => 'HueConecta',
        'huememo' => 'HueMemo',
        'huetrivia' => 'HueTrivia',
        'huedamas' => 'HueDamas',
        'hueajedrez' => 'HueAjedrez',
        'huereversi' => 'HueReversi',
        'huetateti' => 'HueTaTeTi',
        'huepool' => 'HuePool',
        'hueludo' => 'HueLudo',
        'hueludoroyal' => 'HueLudo Real',
        'huerummy' => 'HueRummy',
        'hueburako' => 'HueBurako',
        'huescrabble' => 'HueScrabble',
        'huezip' => 'HueZip',
        'huesoccer' => 'HueSoccer',
        'huedoku6' => 'HueDoku 6x6',
        'huedoku9facil' => 'HueDoku 9x9 Fácil',
        'huedoku9dificil' => 'HueDoku 9x9 Difícil',
        // Faltaba también para HuePacMan (se veía el código crudo en las
        // notificaciones, "huepacman", en vez de un nombre) — de paso.
        'huepacman' => 'HuePacMan',
        'huetetris' => 'HueTetris',
        'huecolumns' => 'HueColumns',
    ];
    return $nombres[$codigo] ?? $codigo;
}

/** Un desafío sin jugar se cae solo a los 3 días. */
const RH_DESAFIO_DIAS = 3;

function rh_juego_existe(string $codigo): bool
{
    return isset(RH_JUEGOS[$codigo]);
}

/**
 * Si un juego tiene modo solitario contra la IA de la app.
 *
 * Lista hardcodeada a propósito, mismo estilo que el resto del archivo (no hay
 * un registro genérico de "capacidades" por juego): sumar un juego acá es el
 * único punto a tocar cuando otro además de Damas tenga IA.
 */
function rh_juego_ia_disponible(string $codigo): bool
{
    return in_array($codigo, ['huedamas', 'hueajedrez', 'huereversi', 'huetateti'], true);
}

/**
 * Modo en el que un JUGADOR puede jugar este juego: `'solo'` (nunca se
 * enfrenta a otra persona), `'multiplayer'` (nunca se juega solo) o
 * `'ambos'`. Es distinto de `rh_juego_modo()` (que es la forma de GUARDAR
 * la partida — 'turnos'/'sala'/'puntaje'/'cuidado' — un detalle interno,
 * no algo que el usuario elija). Se deriva acá, no se guarda en ningún
 * lado, para no desincronizarse de `RH_JUEGOS`/`rh_juego_ia_disponible()`.
 */
function rh_juego_modo_cliente(string $codigo): string
{
    $modo = rh_juego_modo($codigo);
    if ($modo === 'sala') {
        return 'multiplayer'; // hasta 4, arranca con mínimo 2 aceptados: nunca solo.
    }
    if ($modo === 'cuidado') {
        return 'solo'; // HueGotchi: no se reta a nadie.
    }
    if ($modo === 'turnos') {
        return rh_juego_ia_disponible($codigo) ? 'ambos' : 'multiplayer';
    }
    // 'puntaje': cada uno juega su partida suelta (solo) y también se puede
    // desafiar a un rival humano para comparar puntajes — nunca contra IA.
    return 'ambos';
}

/** Códigos de juego que este usuario marcó como favorito, más recientes primero da igual: el orden lo decide quien lo consume. */
function rh_juego_favoritos(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare('SELECT JuegoCodigo FROM HuePlayFavorito WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $codigos = [];
    $res = $stmt->get_result();
    while ($f = $res->fetch_assoc()) {
        $codigos[] = $f['JuegoCodigo'];
    }
    $stmt->close();
    return $codigos;
}

/**
 * El `UserId` de la cuenta bot compartida por todos los juegos con IA.
 *
 * Cacheada en la request: se consulta varias veces (crear desafío, cerrar
 * duelo, filtrar notificaciones) y sólo existe una fila así en toda la base.
 */
function rh_juego_bot_user_id(mysqli $conn): int
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $res = $conn->query('SELECT UserId FROM Usuario WHERE EsBot = 1 LIMIT 1');
    $fila = $res ? $res->fetch_assoc() : null;
    $cache = (int) ($fila['UserId'] ?? 0);
    return $cache;
}

/** Si ese usuario es la cuenta bot (nunca hay que notificarle ni sumarle partidas). */
function rh_juego_es_bot(mysqli $conn, int $userId): bool
{
    return $userId > 0 && $userId === rh_juego_bot_user_id($conn);
}

/**
 * Actualiza el historial de a pares entre dos usuarios humanos, para un
 * juego. `UserIdA` siempre es el menor de los dos UserId (sin importar quién
 * ganó), así el par tiene una sola fila posible sin importar el orden en que
 * se pasen los argumentos.
 *
 * `$ganadorUserId === null` es empate/tablas: suma a `Empates`, no a ninguna
 * de las dos victorias. Se saltea sin hacer nada si cualquiera de los dos es
 * el bot — el historial es entre personas, no contra la IA.
 */
function rh_juego_registrar_historial_par(mysqli $conn, int $userId1, int $userId2, string $juegoCodigo, ?int $ganadorUserId): void
{
    if ($userId1 === $userId2 || $userId1 <= 0 || $userId2 <= 0) {
        return;
    }
    if (rh_juego_es_bot($conn, $userId1) || rh_juego_es_bot($conn, $userId2)) {
        return;
    }

    $userIdA = min($userId1, $userId2);
    $userIdB = max($userId1, $userId2);
    $sumaA = $ganadorUserId === $userIdA ? 1 : 0;
    $sumaB = $ganadorUserId === $userIdB ? 1 : 0;
    $sumaEmpate = $ganadorUserId === null ? 1 : 0;

    $stmt = $conn->prepare(
        'INSERT INTO JuegoHistorialPar (UserIdA, UserIdB, JuegoCodigo, VictoriasA, VictoriasB, Empates)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            VictoriasA = VictoriasA + VALUES(VictoriasA),
            VictoriasB = VictoriasB + VALUES(VictoriasB),
            Empates = Empates + VALUES(Empates)'
    );
    $stmt->bind_param('iisiii', $userIdA, $userIdB, $juegoCodigo, $sumaA, $sumaB, $sumaEmpate);
    $stmt->execute();
    $stmt->close();
}

/** El historial de a pares contra alguien, en un juego. Puntos de vista relativo a $userId. */
function rh_juego_historial_par(mysqli $conn, int $userId, int $rivalUserId, string $juegoCodigo): array
{
    $userIdA = min($userId, $rivalUserId);
    $userIdB = max($userId, $rivalUserId);

    $stmt = $conn->prepare(
        'SELECT VictoriasA, VictoriasB, Empates FROM JuegoHistorialPar WHERE UserIdA = ? AND UserIdB = ? AND JuegoCodigo = ?'
    );
    $stmt->bind_param('iis', $userIdA, $userIdB, $juegoCodigo);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$fila) {
        return ['misVictorias' => 0, 'susVictorias' => 0, 'empates' => 0];
    }

    $soyA = $userId === $userIdA;
    return [
        'misVictorias' => (int) ($soyA ? $fila['VictoriasA'] : $fila['VictoriasB']),
        'susVictorias' => (int) ($soyA ? $fila['VictoriasB'] : $fila['VictoriasA']),
        'empates' => (int) $fila['Empates'],
    ];
}

/**
 * Nivel a partir de los puntos acumulados.
 *
 * Curva cuadrática: el nivel L necesita 50*(L-1)^2 puntos. Los primeros niveles
 * salen en una o dos partidas (que es lo que engancha) y después cuesta cada
 * vez más, así que nadie llega al techo en una tarde.
 */
function rh_juego_nivel(int $puntos): int
{
    if ($puntos < 50) {
        return 1;
    }
    $nivel = (int) floor(sqrt($puntos / 50)) + 1;
    return min($nivel, 99);
}

/** Puntos que faltan para el nivel siguiente, para pintar la barra de progreso. */
function rh_juego_progreso(int $puntos): array
{
    $nivel = rh_juego_nivel($puntos);
    $base = 50 * ($nivel - 1) ** 2;
    $techo = 50 * $nivel ** 2;
    return [
        'nivel' => $nivel,
        'puntos' => $puntos,
        'nivelDesde' => $base,
        'nivelHasta' => $techo,
        'faltan' => max(0, $techo - $puntos),
    ];
}

/** Crea la fila de perfil si el usuario todavía no jugó nunca. */
function rh_juego_perfil(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare('SELECT * FROM UsuarioJuegoPerfil WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$fila) {
        $stmt = $conn->prepare('INSERT IGNORE INTO UsuarioJuegoPerfil (UserId) VALUES (?)');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $stmt->close();
        $fila = [
            'UserId' => $userId,
            'PuntosTotales' => 0,
            'Nivel' => 1,
            'PartidasJugadas' => 0,
            'DesafiosGanados' => 0,
            'DesafiosPerdidos' => 0,
        ];
    }

    return $fila;
}

/**
 * Recorta el puntaje informado a lo que el juego admite.
 *
 * Devuelve el puntaje válido, o `null` si la partida es directamente increíble
 * (duró menos de lo posible).
 */
function rh_juego_puntaje_valido(string $codigo, int $puntos, ?int $duracion): ?int
{
    $def = RH_JUEGOS[$codigo] ?? null;
    if (!$def) {
        return null;
    }
    if ($puntos < 0) {
        return null;
    }
    if ($duracion !== null && $duracion < $def['minSegundos']) {
        return null;
    }
    return min($puntos, $def['maxPuntos']);
}

/**
 * Guarda una partida y actualiza el perfil.
 *
 * @return array el progreso después de sumar, con `subioDeNivel`.
 */
function rh_juego_registrar_partida(
    mysqli $conn,
    int $userId,
    string $codigo,
    int $puntos,
    ?int $duracion = null,
    ?int $desafioId = null,
    // HueGotchi suma de a poco con cada acción de cuidado, no por partidas.
    // Sin esto, dar de comer contaría como una partida jugada y el contador
    // del hub diría 400 partidas cuando en realidad jugaste diez.
    bool $cuentaPartida = true
): array {
    $antes = rh_juego_perfil($conn, $userId);
    $nivelAntes = rh_juego_nivel((int) $antes['PuntosTotales']);

    $stmt = $conn->prepare(
        'INSERT INTO JuegoPartida (JuegoCodigo, UserId, Puntos, DuracionSegundos, DesafioId)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('siiii', $codigo, $userId, $puntos, $duracion, $desafioId);
    $stmt->execute();
    $stmt->close();

    // El nivel se recalcula en SQL sobre el total ya sumado, no en PHP sobre un
    // valor leído antes: si el usuario tiene dos partidas terminando a la vez,
    // leer-sumar-escribir perdería una.
    $suma = $cuentaPartida ? 1 : 0;
    $stmt = $conn->prepare(
        'UPDATE UsuarioJuegoPerfil
            SET PuntosTotales = PuntosTotales + ?,
                PartidasJugadas = PartidasJugadas + ?
          WHERE UserId = ?'
    );
    $stmt->bind_param('iii', $puntos, $suma, $userId);
    $stmt->execute();
    $stmt->close();

    $despues = rh_juego_perfil($conn, $userId);
    $total = (int) $despues['PuntosTotales'];
    $nivel = rh_juego_nivel($total);

    $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET Nivel = ? WHERE UserId = ?');
    $stmt->bind_param('ii', $nivel, $userId);
    $stmt->execute();
    $stmt->close();

    $progreso = rh_juego_progreso($total);
    $progreso['subioDeNivel'] = $nivel > $nivelAntes;
    $progreso['puntosGanados'] = $puntos;

    return $progreso;
}

/** Récord personal en un juego, para mostrarlo antes de arrancar. */
function rh_juego_record(mysqli $conn, int $userId, string $codigo): int
{
    $stmt = $conn->prepare(
        'SELECT COALESCE(MAX(Puntos), 0) AS Record FROM JuegoPartida WHERE UserId = ? AND JuegoCodigo = ?'
    );
    $stmt->bind_param('is', $userId, $codigo);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return (int) ($fila['Record'] ?? 0);
}

/**
 * Semilla del tablero de un desafío.
 *
 * `random_int` y no `rand()`: no hace falta que sea criptográfica, pero si la
 * semilla fuera predecible se podría pedir el tablero de antemano y resolverlo
 * con tiempo antes de "jugar".
 */
function rh_juego_semilla(): int
{
    return random_int(1, 2147483646);
}

/**
 * A qué pantalla del cliente lleva un duelo — espejo de
 * `app-movil/src/juego/hueplay/rutas.ts::rutaDelDesafio()`. Se usa como
 * `ruta` de las notificaciones de turno para que el toque caiga directo en
 * el tablero, no en una lista.
 */
function rh_hueplay_ruta_duelo(string $codigo, int $desafioId, int $semilla = 0): string
{
    $pantallas = [
        'hueconecta' => 'hueconecta',
        'huedamas' => 'damas',
        'hueajedrez' => 'ajedrez',
        'huereversi' => 'reversi',
        'huetateti' => 'tateti',
        'huepool' => 'huepool',
        'huesoccer' => 'huesoccer',
    ];
    if (isset($pantallas[$codigo])) {
        return '/(app)/hueplay/' . $pantallas[$codigo] . '?desafioId=' . $desafioId;
    }
    $variantesDoku = ['huedoku6' => '6', 'huedoku9facil' => '9facil', 'huedoku9dificil' => '9dificil'];
    if (isset($variantesDoku[$codigo])) {
        return '/(app)/hueplay/huedoku?desafioId=' . $desafioId . '&semilla=' . $semilla . '&variante=' . $variantesDoku[$codigo];
    }
    $otras = [
        'huememo' => 'huememo', 'huetrivia' => 'huetrivia', 'huezip' => 'huezip', 'huepacman' => 'huepacman',
        'huetetris' => 'huetetris', 'huecolumns' => 'huecolumns',
    ];
    $pantalla = $otras[$codigo] ?? 'huematch';
    return '/(app)/hueplay/' . $pantalla . '?desafioId=' . $desafioId . '&semilla=' . $semilla;
}

/** Bandeja unificada nueva de multiplayer, con solapa opcional. */
function rh_hueplay_ruta_bandeja(string $solapa = ''): string
{
    return '/(app)/hueplay/multiplayer' . ($solapa !== '' ? '?solapa=' . $solapa : '');
}

/**
 * Pasa el turno al rival y recalcula cuándo vence, según el plazo elegido al
 * armar el duelo. El `WHERE TurnoDeUserId = ?` es el mismo guard de
 * concurrencia que ya usaba `turno_jugar.php`: si dos jugadas llegaran a la
 * vez, la segunda no encuentra fila para actualizar.
 *
 * Además avisa al que le toca — antes esto quedaba mudo: el turno pasaba
 * pero nadie se enteraba hasta volver a abrir la app.
 */
function rh_juego_avanzar_turno(
    mysqli $conn,
    int $desafioId,
    int $siguienteUserId,
    int $movidaDeUserId,
    int $plazoTurnoSegundos,
    ?string $juegoCodigo = null
): void {
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio
            SET TurnoDeUserId = ?, Estado = 'aceptado',
                ExpiraEn = DATE_ADD(NOW(), INTERVAL ? SECOND),
                RecordatorioTurnoEnviado = 0
          WHERE DesafioId = ? AND TurnoDeUserId = ?"
    );
    $stmt->bind_param('iiii', $siguienteUserId, $plazoTurnoSegundos, $desafioId, $movidaDeUserId);
    $stmt->execute();
    $stmt->close();

    require_once __DIR__ . '/notificaciones.php';
    $ruta = $juegoCodigo !== null
        ? rh_hueplay_ruta_duelo($juegoCodigo, $desafioId)
        : rh_hueplay_ruta_bandeja('tuTurno');
    rh_notificar(
        $conn,
        [$siguienteUserId],
        'juego_tu_turno',
        '¡Te toca jugar!',
        'Tenés un movimiento esperando.',
        $ruta,
        $juegoCodigo !== null ? ['juegoCodigo' => $juegoCodigo] : []
    );
}

/** Puntos de consuelo cuando el duelo se cierra solo, por inacción de alguien. */
const RH_JUEGO_PUNTOS_TURNO_VENCIDO = 20;

/**
 * Cierra un desafío de modo 'turnos' y reparte el resultado.
 *
 * Compartida entre el final normal de una partida (ganó/perdió/empate al
 * mover) y el cierre por vencimiento de turno: a los dos les hace falta lo
 * mismo (marcar el estado, sumar la partida de cada uno, avisar). `$ganadorUserId
 * === null` es empate.
 *
 * El `WHERE Estado IN (...)` es el guard de concurrencia: si el desafío ya se
 * había cerrado por otro camino (alguien jugó justo antes de que el cron
 * llegara), esta llamada no hace nada y lo dice en el resultado.
 */
function rh_juego_cerrar_desafio_turnos(
    mysqli $conn,
    array $desafio,
    ?int $ganadorUserId,
    int $puntosRetador,
    int $puntosRetado,
    bool $porVencimiento = false
): array {
    $desafioId = (int) $desafio['DesafioId'];
    $retador = (int) $desafio['UserIdRetador'];
    $retado = (int) $desafio['UserIdRetado'];
    $codigo = $desafio['JuegoCodigo'];

    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio
            SET Estado = 'terminado', GanadorUserId = ?, TurnoDeUserId = NULL
          WHERE DesafioId = ? AND Estado IN ('pendiente','aceptado')"
    );
    $stmt->bind_param('ii', $ganadorUserId, $desafioId);
    $stmt->execute();
    $cerrado = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$cerrado) {
        return ['cerrado' => false];
    }

    rh_juego_registrar_historial_par($conn, $retador, $retado, $codigo, $ganadorUserId);

    $progresoRetador = rh_juego_es_bot($conn, $retador)
        ? null
        : rh_juego_registrar_partida($conn, $retador, $codigo, $puntosRetador, null, $desafioId);
    $progresoRetado = rh_juego_es_bot($conn, $retado)
        ? null
        : rh_juego_registrar_partida($conn, $retado, $codigo, $puntosRetado, null, $desafioId);

    $nombreJuego = rh_juego_titulo($codigo);

    if ($ganadorUserId !== null) {
        $perdedor = $ganadorUserId === $retador ? $retado : $retador;

        if (!rh_juego_es_bot($conn, $ganadorUserId)) {
            $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosGanados = DesafiosGanados + 1 WHERE UserId = ?');
            $stmt->bind_param('i', $ganadorUserId);
            $stmt->execute();
            $stmt->close();

            rh_notificar($conn, [$ganadorUserId], 'juego_desafio_fin', '¡Ganaste el duelo!',
                'Ganaste tu partida de ' . $nombreJuego, rh_hueplay_ruta_bandeja('historial'),
                ['juegoCodigo' => $codigo]);
        }

        if (!rh_juego_es_bot($conn, $perdedor)) {
            $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosPerdidos = DesafiosPerdidos + 1 WHERE UserId = ?');
            $stmt->bind_param('i', $perdedor);
            $stmt->execute();
            $stmt->close();

            $cuerpo = $porVencimiento
                ? 'No respondiste a tiempo y perdiste tu partida de ' . $nombreJuego
                : 'Perdiste tu partida de ' . $nombreJuego;
            rh_notificar($conn, [$perdedor], 'juego_desafio_fin', 'Perdiste el duelo', $cuerpo, rh_hueplay_ruta_bandeja('historial'),
                ['juegoCodigo' => $codigo]);
        }
    } else {
        $humanos = array_values(array_filter([$retador, $retado], fn (int $u) => !rh_juego_es_bot($conn, $u)));
        if ($humanos) {
            rh_notificar($conn, $humanos, 'juego_desafio_fin', 'Empate',
                'Tu partida de ' . $nombreJuego . ' terminó empatada', rh_hueplay_ruta_bandeja('historial'),
                ['juegoCodigo' => $codigo]);
        }
    }

    // Si este duelo era una partida de torneo, avanzar la llave/tabla.
    require_once __DIR__ . '/torneo.php';
    rh_torneo_al_cerrar_desafio($conn, $desafioId, $ganadorUserId);

    return [
        'cerrado' => true,
        'ganadorUserId' => $ganadorUserId,
        'progresoRetador' => $progresoRetador,
        'progresoRetado' => $progresoRetado,
    ];
}

/**
 * Cierra por inacción un desafío de modo 'turnos' cuyo turno venció: pierde
 * quien tenía que mover y no lo hizo. Puntos bajos a propósito (ver
 * `RH_JUEGO_PUNTOS_TURNO_VENCIDO`): esperar a que venza nunca debería convenir
 * más que jugar.
 */
function rh_juego_resolver_turno_vencido(mysqli $conn, array $desafio): array
{
    $turnoDe = (int) ($desafio['TurnoDeUserId'] ?? 0);
    $retador = (int) $desafio['UserIdRetador'];
    $retado = (int) $desafio['UserIdRetado'];

    if ($turnoDe !== $retador && $turnoDe !== $retado) {
        return ['cerrado' => false];
    }

    $ganador = $turnoDe === $retador ? $retado : $retador;
    $puntosRetador = $ganador === $retador ? RH_JUEGO_PUNTOS_TURNO_VENCIDO : 0;
    $puntosRetado = $ganador === $retado ? RH_JUEGO_PUNTOS_TURNO_VENCIDO : 0;

    return rh_juego_cerrar_desafio_turnos($conn, $desafio, $ganador, $puntosRetador, $puntosRetado, true);
}

/**
 * Marca vencidos los desafíos que nadie jugó a tiempo.
 *
 * Se llama al listar (además del cron `juego_turnos_vencidos.php`, que cubre a
 * quien no vuelve a abrir la bandeja): son pocas filas y así el estado que ve
 * el usuario siempre está al día.
 *
 * En modo 'puntaje' el vencimiento sigue siendo neutro (nadie "debía" un
 * movimiento puntual). En modo 'turnos', desde que el plazo por turno es
 * configurable, no responder a tiempo es una derrota — se resuelve con el
 * mismo camino que usa el cron.
 */
function rh_juego_expirar_desafios(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio
            SET Estado = 'expirado'
          WHERE Modo = 'puntaje' AND Estado IN ('pendiente','aceptado')
            AND ExpiraEn <= NOW()
            AND (UserIdRetador = ? OR UserIdRetado = ?)"
    );
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare(
        "SELECT * FROM JuegoDesafio
          WHERE Modo = 'turnos' AND Estado IN ('pendiente','aceptado')
            AND ExpiraEn <= NOW()
            AND (UserIdRetador = ? OR UserIdRetado = ?)"
    );
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $vencidos = [];
    while ($fila = $res->fetch_assoc()) {
        $vencidos[] = $fila;
    }
    $stmt->close();

    foreach ($vencidos as $d) {
        rh_juego_resolver_turno_vencido($conn, $d);
    }

    rh_juego_expirar_partidas($conn, $userId);
}

/**
 * Cuántos "te toca a vos" hay en total, para el globito de Multiplayer en el
 * hub — duelos donde es mi turno + salas donde es mi turno o tengo una
 * invitación sin responder.
 *
 * Antes esto sólo contaba desafíos de PUNTAJE sin responder
 * (`UserIdRetado = ? AND PuntosRetado IS NULL`), un criterio de antes de que
 * existieran los duelos por TURNOS y las salas: alguien con el turno de un
 * duelo de Ajedrez, o con una sala esperando su jugada, veía el globito
 * apagado aunque `multiplayer.tsx` sí le mostrara la partida en "Tu turno".
 * Este cálculo replica exactamente el criterio de esa pantalla
 * (`esMiTurno` de `rh_juego_serializar_desafio()` / `rh_sala_serializar()`),
 * pero como COUNT en vez de traer y serializar cada fila.
 */
function rh_juego_notif_turno_count(mysqli $conn, int $userId): int
{
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS N FROM JuegoDesafio
          WHERE Estado IN ('pendiente','aceptado')
            AND (
                (Modo = 'turnos' AND TurnoDeUserId = ?)
                OR (Modo = 'puntaje' AND (
                        (UserIdRetador = ? AND PuntosRetador IS NULL) OR
                        (UserIdRetado = ? AND PuntosRetado IS NULL)
                    ))
            )"
    );
    $stmt->bind_param('iii', $userId, $userId, $userId);
    $stmt->execute();
    $n = (int) ($stmt->get_result()->fetch_assoc()['N'] ?? 0);
    $stmt->close();

    require_once __DIR__ . '/desafio_tablero.php';
    $stmt = $conn->prepare(
        "SELECT s.JuegoCodigo, s.Estado, s.TurnoDeSalaJugadorId, sj.SalaJugadorId, sj.Estado AS EstadoJugador
           FROM JuegoSala s
           INNER JOIN JuegoSalaJugador sj ON sj.SalaId = s.SalaId
          WHERE sj.UserId = ? AND sj.Estado <> 'rechazado' AND s.Estado NOT IN ('cancelada','terminada')"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($s = $res->fetch_assoc()) {
        // Una sala de duelo 1v1 que ya arrancó vive como JuegoDesafio —
        // ya contada arriba. Sólo cuenta acá mientras se arma.
        if (rh_juego_es_duelo($s['JuegoCodigo']) && $s['Estado'] !== 'esperando') {
            continue;
        }
        if ($s['EstadoJugador'] === 'invitado') {
            $n++;
        } elseif ($s['Estado'] === 'jugando' && (int) $s['TurnoDeSalaJugadorId'] === (int) $s['SalaJugadorId']) {
            $n++;
        }
    }
    $stmt->close();

    return $n;
}

/**
 * Cierra los duelos cuyo PLAZO DE PARTIDA entero venció sin que nadie ganara
 * (distinto del plazo por turno). Queda en tablas: en turnos se cierra con
 * ganador nulo; en puntaje se marca 'expirado' (neutro, como el vencimiento
 * de turno de puntaje). `$userId = 0` procesa todos (para el cron).
 */
function rh_juego_expirar_partidas(mysqli $conn, int $userId = 0): void
{
    $filtroUsuario = $userId > 0 ? ' AND (UserIdRetador = ? OR UserIdRetado = ?)' : '';

    $sql = "SELECT * FROM JuegoDesafio
             WHERE Modo = 'turnos' AND Estado IN ('pendiente','aceptado')
               AND PartidaVenceEn IS NOT NULL AND PartidaVenceEn <= NOW()" . $filtroUsuario;
    $stmt = $conn->prepare($sql);
    if ($userId > 0) {
        $stmt->bind_param('ii', $userId, $userId);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $enTablas = [];
    while ($fila = $res->fetch_assoc()) {
        $enTablas[] = $fila;
    }
    $stmt->close();
    foreach ($enTablas as $d) {
        rh_juego_cerrar_desafio_turnos($conn, $d, null, 0, 0);
    }

    $sql = "UPDATE JuegoDesafio SET Estado = 'expirado'
             WHERE Modo = 'puntaje' AND Estado IN ('pendiente','aceptado')
               AND PartidaVenceEn IS NOT NULL AND PartidaVenceEn <= NOW()" . $filtroUsuario;
    $stmt = $conn->prepare($sql);
    if ($userId > 0) {
        $stmt->bind_param('ii', $userId, $userId);
    }
    $stmt->execute();
    $stmt->close();
}

/**
 * Cierra un desafío cuando ya jugaron los dos y reparte el resultado.
 *
 * El empate no le suma a nadie en la columna de ganados/perdidos, pero los
 * puntos de la partida ya los cobró cada uno por separado.
 */
function rh_juego_resolver_desafio(mysqli $conn, array $desafio): array
{
    $retador = (int) $desafio['UserIdRetador'];
    $retado = (int) $desafio['UserIdRetado'];
    $pr = $desafio['PuntosRetador'];
    $pt = $desafio['PuntosRetado'];

    if ($pr === null || $pt === null) {
        return ['cerrado' => false];
    }

    $pr = (int) $pr;
    $pt = (int) $pt;
    $ganador = $pr === $pt ? null : ($pr > $pt ? $retador : $retado);

    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio SET Estado = 'terminado', GanadorUserId = ? WHERE DesafioId = ?"
    );
    $stmt->bind_param('ii', $ganador, $desafio['DesafioId']);
    $stmt->execute();
    $stmt->close();

    if ($ganador !== null) {
        $perdedor = $ganador === $retador ? $retado : $retador;
        rh_juego_perfil($conn, $ganador);
        rh_juego_perfil($conn, $perdedor);

        $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosGanados = DesafiosGanados + 1 WHERE UserId = ?');
        $stmt->bind_param('i', $ganador);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosPerdidos = DesafiosPerdidos + 1 WHERE UserId = ?');
        $stmt->bind_param('i', $perdedor);
        $stmt->execute();
        $stmt->close();
    }

    // Si este duelo era una partida de torneo, avanzar la llave/tabla.
    require_once __DIR__ . '/torneo.php';
    rh_torneo_al_cerrar_desafio($conn, (int) $desafio['DesafioId'], $ganador);

    return ['cerrado' => true, 'ganadorUserId' => $ganador];
}

/** Nombre visible de alguien, para los textos de notificación. */
function rh_juego_nombre(mysqli $conn, int $userId): string
{
    $stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $u = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$u) {
        return 'Alguien';
    }
    return !empty($u['Username']) ? '@' . $u['Username'] : ($u['NombreCompleto'] ?: 'Alguien');
}

/** Serializa un desafío para el front, siempre desde la perspectiva de quien mira. */
function rh_juego_serializar_desafio(mysqli $conn, array $d, int $yo): array
{
    $soyRetador = (int) $d['UserIdRetador'] === $yo;
    $otroId = $soyRetador ? (int) $d['UserIdRetado'] : (int) $d['UserIdRetador'];
    $misPuntos = $soyRetador ? $d['PuntosRetador'] : $d['PuntosRetado'];
    $susPuntos = $soyRetador ? $d['PuntosRetado'] : $d['PuntosRetador'];

    // El puntaje del rival se tapa hasta que jugaste. Saber contra qué número
    // vas antes de empezar cambia cómo jugás (y si ya lo superaste, tienta a
    // dejar la partida a medias), así que se revela recién al terminar.
    $rivalYaJugo = $susPuntos !== null;
    if ($misPuntos === null) {
        $susPuntos = null;
    }

    // HueSoccerSkinFicha/Pelota se traen siempre (no sólo para HueSoccer): es
    // una sola consulta ya existente, el costo de 2 columnas más es
    // despreciable — más simple que ramificar por JuegoCodigo.
    $stmt = $conn->prepare(
        'SELECT UserId, NombreCompleto, Username, AvatarPath, HueSoccerSkinFicha, HueSoccerSkinPelota, HueSoccerColorFicha
           FROM Usuario WHERE UserId = ?'
    );
    $stmt->bind_param('i', $otroId);
    $stmt->execute();
    $otro = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $modo = $d['Modo'] ?? 'puntaje';

    // En modo turnos "me toca" no se deduce de si ya jugué —los dos juegan
    // muchas veces— sino de a quién apunta el turno.
    $esMiTurno = $modo === 'turnos'
        ? ((int) ($d['TurnoDeUserId'] ?? 0) === $yo && in_array($d['Estado'], ['pendiente', 'aceptado'], true))
        : !$misPuntos;

    return [
        'desafioId' => (int) $d['DesafioId'],
        'juegoCodigo' => $d['JuegoCodigo'],
        'modo' => $modo,
        'estado' => $d['Estado'],
        'soyRetador' => $soyRetador,
        'semilla' => (int) $d['Semilla'],
        'tablero' => $d['Tablero'] ?? null,
        'turnoDeUserId' => isset($d['TurnoDeUserId']) && $d['TurnoDeUserId'] !== null
            ? (int) $d['TurnoDeUserId']
            : null,
        'esMiTurno' => $esMiTurno,
        // Qué ficha soy en el tablero ('1' retador, '2' retado).
        'miFicha' => $soyRetador ? '1' : '2',
        'movimientos' => (int) ($d['Movimientos'] ?? 0),
        'misPuntos' => $misPuntos === null ? null : (int) $misPuntos,
        'susPuntos' => $susPuntos === null ? null : (int) $susPuntos,
        // Mientras el rival no jugó, su puntaje va en null y el front muestra
        // "esperando": mostrar un 0 haría creer que jugó y sacó cero.
        'yaJugue' => $misPuntos !== null,
        'rivalYaJugo' => $rivalYaJugo,
        'ganadorUserId' => $d['GanadorUserId'] === null ? null : (int) $d['GanadorUserId'],
        'otro' => [
            'userId' => $otroId,
            'nombreCompleto' => $otro['NombreCompleto'] ?? '',
            'username' => $otro['Username'] ?? '',
            'avatarPath' => $otro['AvatarPath'] ?? null,
            'skinFicha' => $otro['HueSoccerSkinFicha'] ?? 'clasica',
            'skinPelota' => $otro['HueSoccerSkinPelota'] ?? 'clasica',
            'colorFicha' => $otro['HueSoccerColorFicha'] ?? 'rojo',
        ],
        'creadoEn' => $d['CreatedAt'],
        'expiraEn' => $d['ExpiraEn'],
        'plazoTurnoSegundos' => (int) ($d['PlazoTurnoSegundos'] ?? 604800),
        'esRivalIA' => rh_juego_es_bot($conn, $otroId),
    ];
}
