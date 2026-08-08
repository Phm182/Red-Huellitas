<?php
/**
 * Salas de hasta 4 jugadores para HuePlay (Ludo, y después Rummy).
 *
 * Es genérico a propósito: no sabe nada de las reglas de ningún juego en
 * particular. Arma/administra la sala (quién está invitado, quién aceptó,
 * cuándo arranca, cuándo se cierra); el tablero inicial, aplicar una jugada y
 * "sacar las fichas de alguien expulsado" son cosas específicas de cada
 * juego y las resuelve el endpoint de ESE juego (mismo criterio que
 * `desafio_crear.php` arma el tablero inicial por `JuegoCodigo` en vez de que
 * `juegos.php` sepa de Damas o Ajedrez).
 */

require_once __DIR__ . '/juegos.php';

/** Sin 0/O/1/I/L: se lee y se tipea a mano, esos caracteres se confunden. */
const RH_SALA_ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function rh_sala_codigo_nuevo(mysqli $conn): string
{
    do {
        $codigo = '';
        for ($i = 0; $i < 6; $i++) {
            $codigo .= RH_SALA_ALFABETO_CODIGO[random_int(0, strlen(RH_SALA_ALFABETO_CODIGO) - 1)];
        }
        $stmt = $conn->prepare('SELECT SalaId FROM JuegoSala WHERE CodigoInvitacion = ?');
        $stmt->bind_param('s', $codigo);
        $stmt->execute();
        $choca = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    } while ($choca);

    return $codigo;
}

function rh_sala_obtener(mysqli $conn, int $salaId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM JuegoSala WHERE SalaId = ?');
    $stmt->bind_param('i', $salaId);
    $stmt->execute();
    $sala = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $sala ?: null;
}

/** Los asientos de una sala, en un estado dado (o todos si no se filtra). */
function rh_sala_jugadores(mysqli $conn, int $salaId, ?array $estados = null): array
{
    if ($estados === null) {
        $stmt = $conn->prepare('SELECT * FROM JuegoSalaJugador WHERE SalaId = ? ORDER BY SalaJugadorId ASC');
        $stmt->bind_param('i', $salaId);
    } else {
        $placeholders = implode(',', array_fill(0, count($estados), '?'));
        $stmt = $conn->prepare("SELECT * FROM JuegoSalaJugador WHERE SalaId = ? AND Estado IN ($placeholders) ORDER BY SalaJugadorId ASC");
        $tipos = 'i' . str_repeat('s', count($estados));
        $stmt->bind_param($tipos, $salaId, ...$estados);
    }
    $stmt->execute();
    $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $filas;
}

/**
 * Crea la sala + el asiento del creador (ya aceptado) + un asiento
 * 'invitado' por cada persona invitada puntualmente, y notifica.
 */
function rh_sala_crear(
    mysqli $conn,
    int $userId,
    string $juegoCodigo,
    int $maxJugadores,
    bool $completarConIA,
    string $politicaAbandono,
    int $plazoTurnoHoras,
    array $invitadosUserIds
): array {
    $codigo = rh_sala_codigo_nuevo($conn);
    $completarConIAInt = $completarConIA ? 1 : 0;

    $stmt = $conn->prepare(
        'INSERT INTO JuegoSala (JuegoCodigo, CreadorUserId, MaxJugadores, CompletarConIA, PoliticaAbandono, PlazoTurnoHoras, CodigoInvitacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('siiisis', $juegoCodigo, $userId, $maxJugadores, $completarConIAInt, $politicaAbandono, $plazoTurnoHoras, $codigo);
    $stmt->execute();
    $salaId = $conn->insert_id;
    $stmt->close();

    $stmt = $conn->prepare("INSERT INTO JuegoSalaJugador (SalaId, UserId, Estado) VALUES (?, ?, 'aceptado')");
    $stmt->bind_param('ii', $salaId, $userId);
    $stmt->execute();
    $stmt->close();

    $invitadosValidos = [];
    foreach (array_unique(array_map('intval', $invitadosUserIds)) as $invitadoId) {
        if ($invitadoId <= 0 || $invitadoId === $userId) {
            continue;
        }
        $stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A' AND EsBot = 0");
        $stmt->bind_param('i', $invitadoId);
        $stmt->execute();
        $existe = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$existe) {
            continue;
        }
        $stmt = $conn->prepare("INSERT INTO JuegoSalaJugador (SalaId, UserId, Estado) VALUES (?, ?, 'invitado')");
        $stmt->bind_param('ii', $salaId, $invitadoId);
        $stmt->execute();
        $stmt->close();
        $invitadosValidos[] = $invitadoId;
    }

    if ($invitadosValidos) {
        rh_notificar(
            $conn,
            $invitadosValidos,
            'juego_desafio',
            'Te invitaron a jugar',
            rh_juego_nombre($conn, $userId) . ' te invitó a una sala de ' . rh_juego_titulo($juegoCodigo),
            '/(app)/hueplay/desafios',
            ['actorUserId' => $userId]
        );
    }

    return rh_sala_obtener($conn, $salaId);
}

/** Sumarse con el código compartible — sin invitación previa. */
function rh_sala_unirse_codigo(mysqli $conn, int $userId, string $codigoInvitacion): array
{
    $stmt = $conn->prepare("SELECT * FROM JuegoSala WHERE CodigoInvitacion = ? AND Estado = 'esperando'");
    $stmt->bind_param('s', $codigoInvitacion);
    $stmt->execute();
    $sala = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$sala) {
        return ['error' => 'Código inválido, o esa sala ya no admite jugadores'];
    }

    $salaId = (int) $sala['SalaId'];

    $stmt = $conn->prepare('SELECT * FROM JuegoSalaJugador WHERE SalaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $salaId, $userId);
    $stmt->execute();
    $existente = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($existente) {
        // Ya estaba invitado puntualmente: entrar con el código equivale a aceptar.
        if ($existente['Estado'] === 'invitado') {
            $sjId = (int) $existente['SalaJugadorId'];
            $stmt = $conn->prepare("UPDATE JuegoSalaJugador SET Estado = 'aceptado' WHERE SalaJugadorId = ?");
            $stmt->bind_param('i', $sjId);
            $stmt->execute();
            $stmt->close();
        }
        return ['sala' => rh_sala_obtener($conn, $salaId)];
    }

    $ocupados = count(rh_sala_jugadores($conn, $salaId, ['invitado', 'aceptado']));
    if ($ocupados >= (int) $sala['MaxJugadores']) {
        return ['error' => 'La sala ya está completa'];
    }

    $stmt = $conn->prepare("INSERT INTO JuegoSalaJugador (SalaId, UserId, Estado, UnidoPorCodigo) VALUES (?, ?, 'aceptado', 1)");
    $stmt->bind_param('ii', $salaId, $userId);
    $stmt->execute();
    $stmt->close();

    rh_notificar(
        $conn,
        [(int) $sala['CreadorUserId']],
        'juego_desafio',
        'Se sumó alguien a tu sala',
        rh_juego_nombre($conn, $userId) . ' se unió con el código a tu sala de ' . rh_juego_titulo($sala['JuegoCodigo']),
        '/(app)/hueplay/desafios'
    );

    return ['sala' => rh_sala_obtener($conn, $salaId)];
}

/** Aceptar o rechazar una invitación puntual. */
function rh_sala_responder(mysqli $conn, int $userId, int $salaId, bool $aceptar): bool
{
    $nuevoEstado = $aceptar ? 'aceptado' : 'rechazado';
    $stmt = $conn->prepare(
        "UPDATE JuegoSalaJugador SET Estado = ? WHERE SalaId = ? AND UserId = ? AND Estado = 'invitado'"
    );
    $stmt->bind_param('sii', $nuevoEstado, $salaId, $userId);
    $stmt->execute();
    $ok = $stmt->affected_rows > 0;
    $stmt->close();
    return $ok;
}

/**
 * Deja la sala lista para arrancar: valida que sea el creador, que haya
 * mínimo 2 aceptados, completa con IA si corresponde, y asigna el orden de
 * turno barajado (Posicion 0..N-1) — no en el orden en que se sumaron, para
 * que invitar no sea ventaja de jugar primero.
 *
 * NO arma el tablero ni fija de quién es el turno: eso es específico del
 * juego y lo termina el endpoint que llama a esto (`sala_iniciar.php`), con
 * el mismo criterio que `desafio_crear.php` arma el tablero inicial por
 * `JuegoCodigo`.
 *
 * @return array{sala: array, jugadores: array[]}|array{error: string}
 */
function rh_sala_iniciar_preparar(mysqli $conn, int $salaId, int $userId): array
{
    $sala = rh_sala_obtener($conn, $salaId);
    if (!$sala) {
        return ['error' => 'La sala no existe'];
    }
    if ((int) $sala['CreadorUserId'] !== $userId) {
        return ['error' => 'Sólo quien creó la sala puede iniciarla'];
    }
    if ($sala['Estado'] !== 'esperando') {
        return ['error' => 'La sala ya arrancó o se cerró'];
    }

    $jugadores = rh_sala_jugadores($conn, $salaId, ['aceptado']);
    if (count($jugadores) < 2) {
        return ['error' => 'Hacen falta al menos 2 jugadores para arrancar'];
    }

    $maxJugadores = (int) $sala['MaxJugadores'];
    if ((bool) $sala['CompletarConIA']) {
        $botId = rh_juego_bot_user_id($conn);
        while (count($jugadores) < $maxJugadores) {
            $stmt = $conn->prepare("INSERT INTO JuegoSalaJugador (SalaId, UserId, Estado) VALUES (?, ?, 'aceptado')");
            $stmt->bind_param('ii', $salaId, $botId);
            $stmt->execute();
            $nuevoId = $conn->insert_id;
            $stmt->close();
            $jugadores[] = ['SalaJugadorId' => $nuevoId, 'SalaId' => $salaId, 'UserId' => $botId, 'Estado' => 'aceptado', 'Posicion' => 0, 'TomadoPorIA' => 0];
        }
    }

    shuffle($jugadores);
    foreach ($jugadores as $posicion => $j) {
        $sjId = (int) $j['SalaJugadorId'];
        $stmt = $conn->prepare("UPDATE JuegoSalaJugador SET Posicion = ?, Estado = 'jugando' WHERE SalaJugadorId = ?");
        $stmt->bind_param('ii', $posicion, $sjId);
        $stmt->execute();
        $stmt->close();
        $jugadores[$posicion]['Posicion'] = $posicion;
        $jugadores[$posicion]['Estado'] = 'jugando';
    }

    return ['sala' => $sala, 'jugadores' => $jugadores];
}

/**
 * Cierra una sala y reparte el resultado. `$puntosPorSalaJugadorId` es
 * `[SalaJugadorId => puntos]`; los asientos IA se saltean (no acumulan
 * partidas ni nivel, mismo criterio que el bot en 1v1).
 *
 * El historial de a pares sólo puede registrar "el ganador le ganó a cada
 * uno de los demás humanos" — no hay podio completo (ver la limitación en
 * cada motor de juego), así que no se puede saber el orden entre los que no
 * ganaron.
 */
function rh_sala_cerrar(mysqli $conn, array $sala, array $jugadores, ?int $ganadorSalaJugadorId, array $puntosPorSalaJugadorId): void
{
    $salaId = (int) $sala['SalaId'];
    $stmt = $conn->prepare(
        "UPDATE JuegoSala SET Estado = 'terminada', GanadorSalaJugadorId = ?, TurnoDeSalaJugadorId = NULL, TerminadaEn = NOW() WHERE SalaId = ?"
    );
    $stmt->bind_param('ii', $ganadorSalaJugadorId, $salaId);
    $stmt->execute();
    $stmt->close();

    $juegoCodigo = $sala['JuegoCodigo'];
    $nombreJuego = rh_juego_titulo($juegoCodigo);
    $humanos = [];
    $ganadorUserId = null;

    foreach ($jugadores as $j) {
        $userId = (int) $j['UserId'];
        if (rh_juego_es_bot($conn, $userId)) {
            continue;
        }
        $sjId = (int) $j['SalaJugadorId'];
        $puntos = $puntosPorSalaJugadorId[$sjId] ?? 0;
        rh_juego_registrar_partida($conn, $userId, $juegoCodigo, $puntos, null, null);
        $humanos[] = ['userId' => $userId, 'salaJugadorId' => $sjId];

        if ($ganadorSalaJugadorId !== null && $sjId === $ganadorSalaJugadorId) {
            $ganadorUserId = $userId;
            $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosGanados = DesafiosGanados + 1 WHERE UserId = ?');
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $stmt->close();
        } elseif ($ganadorSalaJugadorId !== null) {
            $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosPerdidos = DesafiosPerdidos + 1 WHERE UserId = ?');
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $stmt->close();
        }
    }

    if ($ganadorUserId !== null) {
        foreach ($humanos as $h) {
            if ($h['userId'] === $ganadorUserId) {
                continue;
            }
            rh_juego_registrar_historial_par($conn, $ganadorUserId, $h['userId'], $juegoCodigo, $ganadorUserId);
        }
    }

    $userIds = array_column($humanos, 'userId');
    if ($userIds) {
        rh_notificar($conn, $userIds, 'juego_desafio_fin', 'Partida terminada',
            'Terminó tu partida de ' . $nombreJuego, '/(app)/hueplay/desafios');
    }
}

/**
 * Cuando venció el turno de un asiento, aplica la política de abandono de
 * la sala. Sólo toca lo genérico (estado del asiento, a quién le sigue el
 * turno, plazo nuevo) — si la política es 'expulsa', el caller (el cron)
 * todavía tiene que sacar las fichas de ese jugador del tablero, que es
 * específico de cada juego.
 *
 * @return array{
 *   politica: string,
 *   salaJugadorAfectado: array,
 *   cerrada: bool,
 *   siguienteSalaJugadorId: ?int
 * }
 */
function rh_sala_resolver_turno_vencido(mysqli $conn, array $sala): array
{
    $salaId = (int) $sala['SalaId'];
    $turnoActualId = (int) $sala['TurnoDeSalaJugadorId'];

    $stmt = $conn->prepare('SELECT * FROM JuegoSalaJugador WHERE SalaJugadorId = ?');
    $stmt->bind_param('i', $turnoActualId);
    $stmt->execute();
    $afectado = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $politica = $sala['PoliticaAbandono'];

    if ($politica === 'ia') {
        // El turno se queda en este mismo asiento: ahora lo juega la IA. No
        // se avanza el puntero de turno acá — el caller (el juego
        // correspondiente) tiene que resolverlo ya mismo, mismo criterio que
        // cuando el bot responde en el mismo request en los duelos 1v1.
        $stmt = $conn->prepare('UPDATE JuegoSalaJugador SET TomadoPorIA = 1 WHERE SalaJugadorId = ?');
        $stmt->bind_param('i', $turnoActualId);
        $stmt->execute();
        $stmt->close();
        return ['politica' => 'ia', 'salaJugadorAfectado' => $afectado, 'cerrada' => false, 'siguienteSalaJugadorId' => $turnoActualId];
    }

    if ($politica === 'expulsa') {
        $stmt = $conn->prepare("UPDATE JuegoSalaJugador SET Estado = 'expulsado' WHERE SalaJugadorId = ?");
        $stmt->bind_param('i', $turnoActualId);
        $stmt->execute();
        $stmt->close();
    }
    // 'espera': no se toca el asiento, sólo se le pasa el turno al que sigue.

    $activos = rh_sala_jugadores($conn, $salaId, ['jugando']);

    if (count($activos) < 2) {
        $ganador = $activos[0]['SalaJugadorId'] ?? null;
        rh_sala_cerrar($conn, $sala, $activos, $ganador !== null ? (int) $ganador : null, []);
        return ['politica' => $politica, 'salaJugadorAfectado' => $afectado, 'cerrada' => true, 'siguienteSalaJugadorId' => null];
    }

    usort($activos, fn ($a, $b) => (int) $a['Posicion'] <=> (int) $b['Posicion']);
    $posicionActual = (int) $afectado['Posicion'];
    $siguiente = null;
    foreach ($activos as $j) {
        if ((int) $j['Posicion'] > $posicionActual) {
            $siguiente = $j;
            break;
        }
    }
    if (!$siguiente) {
        $siguiente = $activos[0];
    }
    $siguienteId = (int) $siguiente['SalaJugadorId'];

    $stmt = $conn->prepare(
        'UPDATE JuegoSala SET TurnoDeSalaJugadorId = ?, TurnoVenceEn = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE SalaId = ?'
    );
    $plazo = (int) $sala['PlazoTurnoHoras'];
    $stmt->bind_param('iii', $siguienteId, $plazo, $salaId);
    $stmt->execute();
    $stmt->close();

    return ['politica' => $politica, 'salaJugadorAfectado' => $afectado, 'cerrada' => false, 'siguienteSalaJugadorId' => $siguienteId];
}

/** El siguiente asiento activo después de $posicionActual, dando la vuelta. Puro, sin DB. */
function rh_sala_siguiente_jugador(array $activos, int $posicionActual): ?array
{
    if (!$activos) {
        return null;
    }
    usort($activos, fn ($a, $b) => (int) $a['Posicion'] <=> (int) $b['Posicion']);
    foreach ($activos as $j) {
        if ((int) $j['Posicion'] > $posicionActual) {
            return $j;
        }
    }
    return $activos[0];
}

/** Pasa el turno de la sala al asiento indicado y le da un plazo nuevo. */
function rh_sala_avanzar_turno(mysqli $conn, int $salaId, int $siguienteSalaJugadorId, int $plazoTurnoHoras): void
{
    $stmt = $conn->prepare(
        'UPDATE JuegoSala SET TurnoDeSalaJugadorId = ?, TurnoVenceEn = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE SalaId = ?'
    );
    $stmt->bind_param('iii', $siguienteSalaJugadorId, $plazoTurnoHoras, $salaId);
    $stmt->execute();
    $stmt->close();
}

/** Serializa una sala + sus asientos para el front, desde la perspectiva de $yo. */
function rh_sala_serializar(mysqli $conn, array $sala, array $jugadores, int $yo): array
{
    $userIds = array_values(array_unique(array_map(fn ($j) => (int) $j['UserId'], $jugadores)));
    $usuarios = [];
    if ($userIds) {
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $conn->prepare("SELECT UserId, NombreCompleto, Username, AvatarPath FROM Usuario WHERE UserId IN ($placeholders)");
        $stmt->bind_param(str_repeat('i', count($userIds)), ...$userIds);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($u = $res->fetch_assoc()) {
            $usuarios[(int) $u['UserId']] = $u;
        }
        $stmt->close();
    }

    $miAsientoId = null;
    $jugadoresSerializados = [];
    foreach ($jugadores as $j) {
        $userId = (int) $j['UserId'];
        $u = $usuarios[$userId] ?? [];
        $esYo = $userId === $yo;
        if ($esYo) {
            $miAsientoId = (int) $j['SalaJugadorId'];
        }
        $jugadoresSerializados[] = [
            'salaJugadorId' => (int) $j['SalaJugadorId'],
            'userId' => $userId,
            'nombreCompleto' => $u['NombreCompleto'] ?? '',
            'username' => $u['Username'] ?? '',
            'avatarPath' => $u['AvatarPath'] ?? null,
            'posicion' => (int) $j['Posicion'],
            'estado' => $j['Estado'],
            'unidoPorCodigo' => (bool) $j['UnidoPorCodigo'],
            'tomadoPorIA' => (bool) $j['TomadoPorIA'],
            'esBot' => rh_juego_es_bot($conn, $userId),
            'esYo' => $esYo,
        ];
    }

    $turnoDeSalaJugadorId = $sala['TurnoDeSalaJugadorId'] !== null ? (int) $sala['TurnoDeSalaJugadorId'] : null;

    return [
        'salaId' => (int) $sala['SalaId'],
        'juegoCodigo' => $sala['JuegoCodigo'],
        'creadorUserId' => (int) $sala['CreadorUserId'],
        'maxJugadores' => (int) $sala['MaxJugadores'],
        'completarConIA' => (bool) $sala['CompletarConIA'],
        'politicaAbandono' => $sala['PoliticaAbandono'],
        'plazoTurnoHoras' => (int) $sala['PlazoTurnoHoras'],
        'codigoInvitacion' => $sala['CodigoInvitacion'],
        'estado' => $sala['Estado'],
        // El tablero NO va acá: en juegos con información oculta (HueRummy,
        // la mano de cada uno) mandar `Tablero` crudo sería mostrarle a
        // cualquiera las cartas de los demás. Cada juego decide qué tanto
        // mostrar: Ludo no tiene nada que ocultar y agrega el tablero crudo
        // de vuelta después de llamar a esta función (`sala_ver.php`,
        // `sala_iniciar.php`, `ludo_tirar.php`, `ludo_mover.php`); Rummy en
        // cambio manda una vista redactada por separado
        // (`rh_rummy_estado_visible()`), nunca este campo.
        'tablero' => null,
        'jugadores' => $jugadoresSerializados,
        'miAsientoId' => $miAsientoId,
        'turnoDeSalaJugadorId' => $turnoDeSalaJugadorId,
        'esMiTurno' => $miAsientoId !== null && $miAsientoId === $turnoDeSalaJugadorId,
        'turnoVenceEn' => $sala['TurnoVenceEn'],
        'ganadorSalaJugadorId' => $sala['GanadorSalaJugadorId'] !== null ? (int) $sala['GanadorSalaJugadorId'] : null,
        'soyCreador' => (int) $sala['CreadorUserId'] === $yo,
        'creadoEn' => $sala['CreatedAt'],
        'iniciadaEn' => $sala['IniciadaEn'],
        'terminadaEn' => $sala['TerminadaEn'],
    ];
}

/** Marca vencidas (perezoso) las salas de este usuario cuyo turno venció. */
function rh_salas_expirar(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare(
        "SELECT DISTINCT s.* FROM JuegoSala s
         INNER JOIN JuegoSalaJugador sj ON sj.SalaId = s.SalaId
         WHERE s.Estado = 'jugando' AND s.TurnoVenceEn <= NOW() AND sj.UserId = ?"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $vencidas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($vencidas as $sala) {
        rh_sala_resolver_turno_vencido($conn, $sala);
    }
}
