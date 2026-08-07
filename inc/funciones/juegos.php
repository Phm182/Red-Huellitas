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
    // 'turnos': un solo tablero que los dos van modificando. Acá `maxPuntos` no
    // aplica porque el puntaje lo pone el servidor, no el cliente.
    'hueconecta' => ['modo' => 'turnos'],
    // HueTrivia tampoco necesita techo: el puntaje lo calcula el servidor a
    // partir de las respuestas, el cliente no informa ningún número.
    'huetrivia' => ['modo' => 'puntaje', 'maxPuntos' => 3000, 'minSegundos' => 0],
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
 * Marca vencidos los desafíos que nadie jugó.
 *
 * Se llama al listar en vez de por cron: son pocas filas y así el estado que ve
 * el usuario siempre está al día, sin depender de una tarea programada más.
 */
function rh_juego_expirar_desafios(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio
            SET Estado = 'expirado'
          WHERE Estado IN ('pendiente','aceptado')
            AND ExpiraEn <= NOW()
            AND (UserIdRetador = ? OR UserIdRetado = ?)"
    );
    $stmt->bind_param('ii', $userId, $userId);
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

    $stmt = $conn->prepare('SELECT UserId, NombreCompleto, Username, AvatarPath FROM Usuario WHERE UserId = ?');
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
        ],
        'creadoEn' => $d['CreatedAt'],
        'expiraEn' => $d['ExpiraEn'],
    ];
}
