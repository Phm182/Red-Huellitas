<?php
/**
 * Torneos de HuePlay para los juegos de duelo 1v1 (ver `sql/070_torneos.sql`).
 *
 * Reusa la maquinaria de "salas de duelo": `rh_desafio_tablero_inicial()` y
 * `rh_juego_es_duelo()` de `desafio_tablero.php`, el patrón de código de
 * `salas.php`, y el mismo INSERT de `JuegoDesafio` que usa `sala_iniciar.php`.
 *
 * El puente es `rh_torneo_al_cerrar_desafio()`: `juegos.php` lo llama al
 * final de cada cierre de duelo (`rh_juego_resolver_desafio` /
 * `rh_juego_cerrar_desafio_turnos`); si el duelo pertenecía a una
 * `TorneoPartida`, avanza el torneo (llave o tabla).
 */

require_once __DIR__ . '/juegos.php';
require_once __DIR__ . '/desafio_tablero.php';
require_once __DIR__ . '/notificaciones.php';

const RH_TORNEO_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RH_TORNEO_TAMANOS = [4, 8, 16];
const RH_TORNEO_PUNTOS_GANAR = 3;
const RH_TORNEO_PUNTOS_EMPATE = 1;

function rh_torneo_codigo_nuevo(mysqli $conn): string
{
    do {
        $codigo = '';
        for ($i = 0; $i < 6; $i++) {
            $codigo .= RH_TORNEO_ALFABETO[random_int(0, strlen(RH_TORNEO_ALFABETO) - 1)];
        }
        $stmt = $conn->prepare('SELECT TorneoId FROM Torneo WHERE CodigoInvitacion = ?');
        $stmt->bind_param('s', $codigo);
        $stmt->execute();
        $choca = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    } while ($choca);

    return $codigo;
}

function rh_torneo_obtener(mysqli $conn, int $torneoId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM Torneo WHERE TorneoId = ?');
    $stmt->bind_param('i', $torneoId);
    $stmt->execute();
    $t = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $t ?: null;
}

function rh_torneo_participantes(mysqli $conn, int $torneoId): array
{
    $stmt = $conn->prepare('SELECT * FROM TorneoParticipante WHERE TorneoId = ? ORDER BY Seed IS NULL, Seed ASC, CreatedAt ASC');
    $stmt->bind_param('i', $torneoId);
    $stmt->execute();
    $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $filas;
}

function rh_torneo_partidas(mysqli $conn, int $torneoId): array
{
    $stmt = $conn->prepare('SELECT * FROM TorneoPartida WHERE TorneoId = ? ORDER BY Ronda ASC, Slot ASC');
    $stmt->bind_param('i', $torneoId);
    $stmt->execute();
    $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $filas;
}

/**
 * Crea el torneo + inscribe al creador + a cada invitado puntual, y notifica.
 * @return array El torneo recién creado.
 */
function rh_torneo_crear(
    mysqli $conn,
    int $userId,
    string $juegoCodigo,
    string $formato,
    int $tamano,
    bool $esPublico,
    int $plazoTurnoSegundos,
    int $plazoRondaMinutos,
    array $invitadosUserIds
): array {
    $codigo = rh_torneo_codigo_nuevo($conn);
    $nombre = rh_juego_titulo($juegoCodigo) . ' · ' . rh_juego_nombre($conn, $userId);
    $publicoInt = $esPublico ? 1 : 0;

    $stmt = $conn->prepare(
        'INSERT INTO Torneo (JuegoCodigo, CreadorUserId, Nombre, Formato, Tamano, CodigoInvitacion, EsPublico, PlazoTurnoSegundos, PlazoRondaMinutos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('sissssiii', $juegoCodigo, $userId, $nombre, $formato, $tamano, $codigo, $publicoInt, $plazoTurnoSegundos, $plazoRondaMinutos);
    $stmt->execute();
    $torneoId = $conn->insert_id;
    $stmt->close();

    $stmt = $conn->prepare("INSERT INTO TorneoParticipante (TorneoId, UserId, Estado) VALUES (?, ?, 'inscripto')");
    $stmt->bind_param('ii', $torneoId, $userId);
    $stmt->execute();
    $stmt->close();

    $invitadosOk = [];
    foreach (array_unique(array_map('intval', $invitadosUserIds)) as $inv) {
        if ($inv <= 0 || $inv === $userId) {
            continue;
        }
        $stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A' AND EsBot = 0");
        $stmt->bind_param('i', $inv);
        $stmt->execute();
        $existe = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$existe) {
            continue;
        }
        $stmt = $conn->prepare("INSERT IGNORE INTO TorneoParticipante (TorneoId, UserId, Estado) VALUES (?, ?, 'inscripto')");
        $stmt->bind_param('ii', $torneoId, $inv);
        $stmt->execute();
        $stmt->close();
        $invitadosOk[] = $inv;
    }

    if ($invitadosOk) {
        rh_notificar(
            $conn,
            $invitadosOk,
            'juego_torneo',
            'Te invitaron a un torneo',
            rh_juego_nombre($conn, $userId) . ' te sumó a un torneo de ' . rh_juego_titulo($juegoCodigo),
            '/(app)/hueplay/torneo/' . $torneoId,
            ['juegoCodigo' => $juegoCodigo]
        );
    }

    // Si el creador invitó de una a todo el cupo (ej. torneo de 4 con 3
    // invitados), arranca sin pasar por el lobby.
    rh_torneo_arrancar_si_lleno($conn, $torneoId);

    return rh_torneo_obtener($conn, $torneoId);
}

/** Sumarse a un torneo en inscripción. @return array{error?:string} */
function rh_torneo_unirse(mysqli $conn, int $userId, int $torneoId): array
{
    $t = rh_torneo_obtener($conn, $torneoId);
    if (!$t) {
        return ['error' => 'El torneo no existe'];
    }
    if ($t['Estado'] !== 'inscripcion') {
        return ['error' => 'Este torneo ya arrancó o se cerró'];
    }

    $stmt = $conn->prepare('SELECT UserId FROM TorneoParticipante WHERE TorneoId = ? AND UserId = ?');
    $stmt->bind_param('ii', $torneoId, $userId);
    $stmt->execute();
    $ya = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($ya) {
        return ['torneo' => $t];
    }

    $inscriptos = count(rh_torneo_participantes($conn, $torneoId));
    if ($inscriptos >= (int) $t['Tamano']) {
        return ['error' => 'El torneo ya está completo'];
    }

    $stmt = $conn->prepare("INSERT INTO TorneoParticipante (TorneoId, UserId, Estado, UnidoPorCodigo) VALUES (?, ?, 'inscripto', 1)");
    $stmt->bind_param('ii', $torneoId, $userId);
    $stmt->execute();
    $stmt->close();

    rh_notificar(
        $conn,
        [(int) $t['CreadorUserId']],
        'juego_torneo',
        'Se anotó alguien a tu torneo',
        rh_juego_nombre($conn, $userId) . ' se sumó a tu torneo de ' . rh_juego_titulo($t['JuegoCodigo']),
        '/(app)/hueplay/torneo/' . $torneoId
    );

    // Al completarse el cupo, el torneo arranca solo — no hace falta que el
    // creador toque "Iniciar".
    rh_torneo_arrancar_si_lleno($conn, $torneoId);

    return ['torneo' => rh_torneo_obtener($conn, $torneoId)];
}

/**
 * Genera el `JuegoDesafio` de una `TorneoPartida` que ya tiene sus dos
 * jugadores, guarda `DesafioId` y avisa a los dos. Mismo INSERT que
 * `sala_iniciar.php`.
 */
function rh_torneo_generar_duelo(mysqli $conn, array $torneo, array $partida): void
{
    $codigo = $torneo['JuegoCodigo'];
    $a = (int) $partida['UserIdA'];
    $b = (int) $partida['UserIdB'];
    $semilla = rh_juego_semilla();
    $modo = rh_juego_modo($codigo);

    if ($modo === 'turnos') {
        $armado = rh_desafio_tablero_inicial($codigo, $a, $b, $semilla);
        $tablero = $armado['tablero'];
        $turnoDe = $armado['turnoDe'];
        $plazoTurno = (int) $torneo['PlazoTurnoSegundos'];
        $expiraSeg = $plazoTurno;
    } else {
        $tablero = null;
        $turnoDe = null;
        $plazoTurno = 86400;
        $expiraSeg = RH_DESAFIO_DIAS * 86400;
    }

    $plazoRonda = (int) $torneo['PlazoRondaMinutos'];
    $partidaVenceExpr = $plazoRonda > 0 ? 'DATE_ADD(NOW(), INTERVAL ' . $plazoRonda . ' MINUTE)' : 'NULL';

    $stmt = $conn->prepare(
        "INSERT INTO JuegoDesafio
            (JuegoCodigo, Modo, PlazoTurnoSegundos, UserIdRetador, UserIdRetado, Semilla, Tablero, TurnoDeUserId, Estado, ExpiraEn, PartidaVenceEn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aceptado', DATE_ADD(NOW(), INTERVAL ? SECOND), $partidaVenceExpr)"
    );
    $stmt->bind_param('ssiiiisii', $codigo, $modo, $plazoTurno, $a, $b, $semilla, $tablero, $turnoDe, $expiraSeg);
    $stmt->execute();
    $desafioId = $conn->insert_id;
    $stmt->close();

    $venceExpr = $plazoRonda > 0 ? 'DATE_ADD(NOW(), INTERVAL ' . $plazoRonda . ' MINUTE)' : 'NULL';
    $stmt = $conn->prepare("UPDATE TorneoPartida SET DesafioId = ?, Estado = 'jugando', VenceEn = $venceExpr WHERE PartidaId = ?");
    $pid = (int) $partida['PartidaId'];
    $stmt->bind_param('ii', $desafioId, $pid);
    $stmt->execute();
    $stmt->close();

    $ruta = rh_hueplay_ruta_duelo($codigo, $desafioId, $semilla);
    rh_notificar(
        $conn,
        [$a, $b],
        'juego_desafio',
        'Te toca tu partida del torneo',
        'Arrancó tu partida de ' . $torneo['Nombre'],
        $ruta,
        ['juegoCodigo' => $codigo]
    );
}

/**
 * Arranca el torneo desde el botón del creador: sólo el creador, con al menos
 * 2 inscriptos. El armado real lo hace `rh_torneo_iniciar_efectivo()`.
 * @return array{error?:string, torneo?:array}
 */
function rh_torneo_iniciar(mysqli $conn, int $torneoId, int $userId): array
{
    $t = rh_torneo_obtener($conn, $torneoId);
    if (!$t) {
        return ['error' => 'El torneo no existe'];
    }
    if ((int) $t['CreadorUserId'] !== $userId) {
        return ['error' => 'Sólo quien creó el torneo puede iniciarlo'];
    }
    if ($t['Estado'] !== 'inscripcion') {
        return ['error' => 'El torneo ya arrancó o se cerró'];
    }
    if (count(rh_torneo_participantes($conn, $torneoId)) < 2) {
        return ['error' => 'Hacen falta al menos 2 jugadores'];
    }

    rh_torneo_iniciar_efectivo($conn, $t);

    return ['torneo' => rh_torneo_obtener($conn, $torneoId)];
}

/**
 * El armado real: baraja los inscriptos, asigna seeds y arma la ronda 1
 * (eliminación) o el fixture entero (liga), disparando los duelos de la
 * primera ronda. Sin chequeos de permiso ni de cupo — los ponen los
 * llamadores (`rh_torneo_iniciar` para el botón del creador,
 * `rh_torneo_arrancar_si_lleno` para el arranque automático).
 */
function rh_torneo_iniciar_efectivo(mysqli $conn, array $t): void
{
    $torneoId = (int) $t['TorneoId'];
    $participantes = rh_torneo_participantes($conn, $torneoId);

    shuffle($participantes);
    $ids = [];
    foreach ($participantes as $i => $p) {
        $seed = $i + 1;
        $uid = (int) $p['UserId'];
        $ids[] = $uid;
        $stmt = $conn->prepare("UPDATE TorneoParticipante SET Seed = ?, Estado = 'jugando' WHERE TorneoId = ? AND UserId = ?");
        $stmt->bind_param('iii', $seed, $torneoId, $uid);
        $stmt->execute();
        $stmt->close();
    }

    $stmt = $conn->prepare("UPDATE Torneo SET Estado = 'en_curso', RondaActual = 1, IniciadoEn = NOW() WHERE TorneoId = ?");
    $stmt->bind_param('i', $torneoId);
    $stmt->execute();
    $stmt->close();
    $t['Estado'] = 'en_curso';
    $t['RondaActual'] = 1;

    if ($t['Formato'] === 'liga') {
        rh_torneo_armar_liga($conn, $t, $ids);
    } else {
        rh_torneo_armar_eliminacion($conn, $t, $ids);
    }
}

/**
 * Si el torneo está en inscripción y se completó el cupo (`Tamano`), lo
 * arranca solo. Se llama después de sumar cada participante — al crear con
 * invitados, al unirse por código o desde el visualizador de torneos
 * abiertos. @return bool true si lo arrancó.
 */
function rh_torneo_arrancar_si_lleno(mysqli $conn, int $torneoId): bool
{
    $t = rh_torneo_obtener($conn, $torneoId);
    if (!$t || $t['Estado'] !== 'inscripcion') {
        return false;
    }
    if (count(rh_torneo_participantes($conn, $torneoId)) < (int) $t['Tamano']) {
        return false;
    }
    rh_torneo_iniciar_efectivo($conn, $t);
    return true;
}

/** Eliminación: la llave tiene `bracket` = menor potencia de 2 que aloja a
 * `n`. Ronda 1 con seeding 1-vs-último (los seeds de arriba que no tienen
 * rival = 'bye'). Como `bracket = 2^ceil(log2(n))`, sólo puede haber byes en
 * la ronda 1 — nunca en rondas siguientes. */
function rh_torneo_armar_eliminacion(mysqli $conn, array $torneo, array $ids): void
{
    $torneoId = (int) $torneo['TorneoId'];
    $n = count($ids);
    $bracket = 2;
    while ($bracket < $n) {
        $bracket *= 2;
    }
    $rondas = (int) round(log($bracket, 2));
    $seeds = array_pad($ids, $bracket, null);

    for ($ronda = 1; $ronda <= $rondas; $ronda++) {
        $slots = (int) ($bracket / (2 ** $ronda));
        for ($slot = 0; $slot < $slots; $slot++) {
            $a = null;
            $b = null;
            $estado = 'pendiente';
            $ganador = null;
            if ($ronda === 1) {
                $a = $seeds[$slot];
                $b = $seeds[$bracket - 1 - $slot];
                if ($a !== null && $b === null) {
                    $estado = 'bye';
                    $ganador = $a; // pasa de ronda sin jugar
                }
            }
            $stmt = $conn->prepare(
                'INSERT INTO TorneoPartida (TorneoId, Ronda, Slot, UserIdA, UserIdB, Estado, GanadorUserId) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->bind_param('iiiiisi', $torneoId, $ronda, $slot, $a, $b, $estado, $ganador);
            $stmt->execute();
            $stmt->close();
        }
    }

    rh_torneo_avanzar_ronda_eliminacion($conn, $torneo, 1);
}

/**
 * Tras resolverse (o al arrancar) las partidas de la ronda `$ronda`:
 *  1. propaga el ganador de cada partida resuelta al slot correspondiente de
 *     la ronda siguiente,
 *  2. genera el duelo real de cualquier partida (de esta ronda o de la que
 *     sigue) que ya tenga A y B y no tenga duelo.
 * NO crea byes: con `bracket = 2^ceil(log2(n))` los byes sólo existen en la
 * ronda 1, creados en `armar_eliminacion`.
 */
function rh_torneo_avanzar_ronda_eliminacion(mysqli $conn, array $torneo, int $ronda): void
{
    $torneoId = (int) $torneo['TorneoId'];
    $partidas = rh_torneo_partidas($conn, $torneoId);
    $deRonda = array_values(array_filter($partidas, fn ($p) => (int) $p['Ronda'] === $ronda));
    $haySiguiente = (bool) array_filter($partidas, fn ($p) => (int) $p['Ronda'] === $ronda + 1);

    foreach ($deRonda as $p) {
        $ganador = $p['GanadorUserId'] !== null ? (int) $p['GanadorUserId'] : null;
        $resuelta = in_array($p['Estado'], ['terminada', 'bye'], true);

        if ($resuelta && $ganador !== null && $haySiguiente) {
            $slotSig = intdiv((int) $p['Slot'], 2);
            $col = ((int) $p['Slot']) % 2 === 0 ? 'UserIdA' : 'UserIdB';
            $rSig = $ronda + 1;
            $stmt = $conn->prepare("UPDATE TorneoPartida SET $col = ? WHERE TorneoId = ? AND Ronda = ? AND Slot = ? AND $col IS NULL");
            $stmt->bind_param('iiii', $ganador, $torneoId, $rSig, $slotSig);
            $stmt->execute();
            $stmt->close();
        }

        if ($p['Estado'] === 'pendiente' && $p['UserIdA'] !== null && $p['UserIdB'] !== null && $p['DesafioId'] === null) {
            rh_torneo_generar_duelo($conn, $torneo, $p);
        }
    }

    // Releer la ronda siguiente: alguna pudo quedar completa (dos byes de
    // ronda 1 alimentando el mismo slot) y hay que arrancarle el duelo.
    if ($haySiguiente) {
        $partidas = rh_torneo_partidas($conn, $torneoId);
        foreach ($partidas as $p) {
            if (
                (int) $p['Ronda'] === $ronda + 1
                && $p['Estado'] === 'pendiente'
                && $p['UserIdA'] !== null
                && $p['UserIdB'] !== null
                && $p['DesafioId'] === null
            ) {
                rh_torneo_generar_duelo($conn, $torneo, $p);
            }
        }
    }
}

/** Liga: todos los cruces (round-robin, método del círculo), agrupados por
 * fecha en `Ronda`. Se disparan los duelos de la fecha 1. */
function rh_torneo_armar_liga(mysqli $conn, array $torneo, array $ids): void
{
    $torneoId = (int) $torneo['TorneoId'];
    $jugadores = $ids;
    if (count($jugadores) % 2 === 1) {
        $jugadores[] = null; // bye rotativo
    }
    $m = count($jugadores);
    $fechas = $m - 1;
    $mitad = $m / 2;
    $rot = $jugadores;

    for ($fecha = 1; $fecha <= $fechas; $fecha++) {
        for ($i = 0; $i < $mitad; $i++) {
            $a = $rot[$i];
            $b = $rot[$m - 1 - $i];
            if ($a === null || $b === null) {
                continue; // descanso
            }
            $slot = $i;
            $stmt = $conn->prepare(
                "INSERT INTO TorneoPartida (TorneoId, Ronda, Slot, UserIdA, UserIdB, Estado) VALUES (?, ?, ?, ?, ?, 'pendiente')"
            );
            $stmt->bind_param('iiiii', $torneoId, $fecha, $slot, $a, $b);
            $stmt->execute();
            $stmt->close();
        }
        // Rotar todos menos el primero.
        $fijo = array_shift($rot);
        $ultimo = array_pop($rot);
        array_unshift($rot, $ultimo);
        array_unshift($rot, $fijo);
    }

    // Disparar la fecha 1.
    $partidas = rh_torneo_partidas($conn, $torneoId);
    foreach ($partidas as $p) {
        if ((int) $p['Ronda'] === 1 && $p['Estado'] === 'pendiente' && $p['DesafioId'] === null) {
            rh_torneo_generar_duelo($conn, $torneo, $p);
        }
    }
}

/**
 * EL HOOK. `juegos.php` lo llama al cerrar cualquier duelo. Si el
 * `$desafioId` está en una `TorneoPartida`, registra el resultado y avanza
 * el torneo (llave o tabla). `$ganadorUserId = null` = empate.
 */
function rh_torneo_al_cerrar_desafio(mysqli $conn, int $desafioId, ?int $ganadorUserId): void
{
    if ($desafioId <= 0) {
        return;
    }
    $stmt = $conn->prepare("SELECT * FROM TorneoPartida WHERE DesafioId = ? AND Estado = 'jugando'");
    $stmt->bind_param('i', $desafioId);
    $stmt->execute();
    $partida = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$partida) {
        return;
    }

    $torneoId = (int) $partida['TorneoId'];
    $torneo = rh_torneo_obtener($conn, $torneoId);
    if (!$torneo || $torneo['Estado'] !== 'en_curso') {
        return;
    }
    $a = (int) $partida['UserIdA'];
    $b = (int) $partida['UserIdB'];

    // En liga un empate no tiene ganador; en eliminación no puede haber
    // empate real (el motor de cada juego siempre define uno para el duelo),
    // pero por las dudas: si vino null, gana el jugador A.
    if ($torneo['Formato'] === 'eliminacion' && $ganadorUserId === null) {
        $ganadorUserId = $a;
    }

    $stmt = $conn->prepare("UPDATE TorneoPartida SET Estado = 'terminada', GanadorUserId = ? WHERE PartidaId = ?");
    $pid = (int) $partida['PartidaId'];
    $stmt->bind_param('ii', $ganadorUserId, $pid);
    $stmt->execute();
    $stmt->close();

    if ($torneo['Formato'] === 'liga') {
        rh_torneo_registrar_liga($conn, $torneo, $a, $b, $ganadorUserId);
        rh_torneo_avanzar_liga($conn, $torneo);
        return;
    }

    // Eliminación: el perdedor queda eliminado, el ganador avanza.
    $perdedor = $ganadorUserId === $a ? $b : $a;
    $stmt = $conn->prepare("UPDATE TorneoParticipante SET Estado = 'eliminado', PartidasPerdidas = PartidasPerdidas + 1 WHERE TorneoId = ? AND UserId = ?");
    $stmt->bind_param('ii', $torneoId, $perdedor);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("UPDATE TorneoParticipante SET PartidasGanadas = PartidasGanadas + 1 WHERE TorneoId = ? AND UserId = ?");
    $stmt->bind_param('ii', $torneoId, $ganadorUserId);
    $stmt->execute();
    $stmt->close();

    rh_torneo_avanzar_ronda_eliminacion($conn, $torneo, (int) $partida['Ronda']);

    // ¿Terminó? La partida de la ronda más alta ya tiene ganador.
    rh_torneo_cerrar_si_corresponde($conn, $torneoId);
}

function rh_torneo_registrar_liga(mysqli $conn, array $torneo, int $a, int $b, ?int $ganador): void
{
    $torneoId = (int) $torneo['TorneoId'];
    if ($ganador === null) {
        foreach ([$a, $b] as $u) {
            $stmt = $conn->prepare('UPDATE TorneoParticipante SET PuntosLiga = PuntosLiga + ? WHERE TorneoId = ? AND UserId = ?');
            $pts = RH_TORNEO_PUNTOS_EMPATE;
            $stmt->bind_param('iii', $pts, $torneoId, $u);
            $stmt->execute();
            $stmt->close();
        }
        return;
    }
    $perdedor = $ganador === $a ? $b : $a;
    $stmt = $conn->prepare('UPDATE TorneoParticipante SET PuntosLiga = PuntosLiga + ?, PartidasGanadas = PartidasGanadas + 1 WHERE TorneoId = ? AND UserId = ?');
    $pts = RH_TORNEO_PUNTOS_GANAR;
    $stmt->bind_param('iii', $pts, $torneoId, $ganador);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare('UPDATE TorneoParticipante SET PartidasPerdidas = PartidasPerdidas + 1 WHERE TorneoId = ? AND UserId = ?');
    $stmt->bind_param('ii', $torneoId, $perdedor);
    $stmt->execute();
    $stmt->close();
}

/** Si toda la fecha actual de la liga terminó, dispara la siguiente; si no
 * queda ninguna, cierra el torneo por puntos. */
function rh_torneo_avanzar_liga(mysqli $conn, array $torneo): void
{
    $torneoId = (int) $torneo['TorneoId'];
    $ronda = (int) $torneo['RondaActual'];
    $partidas = rh_torneo_partidas($conn, $torneoId);
    $deRonda = array_values(array_filter($partidas, fn ($p) => (int) $p['Ronda'] === $ronda));
    $faltan = array_filter($deRonda, fn ($p) => $p['Estado'] !== 'terminada' && $p['Estado'] !== 'bye');
    if ($faltan) {
        return; // la fecha sigue en juego
    }

    $siguiente = array_values(array_filter($partidas, fn ($p) => (int) $p['Ronda'] === $ronda + 1));
    if (!$siguiente) {
        rh_torneo_cerrar_liga($conn, $torneoId);
        return;
    }

    $rSig = $ronda + 1;
    $stmt = $conn->prepare('UPDATE Torneo SET RondaActual = ? WHERE TorneoId = ?');
    $stmt->bind_param('ii', $rSig, $torneoId);
    $stmt->execute();
    $stmt->close();
    $torneo['RondaActual'] = $rSig;

    foreach ($siguiente as $p) {
        if ($p['Estado'] === 'pendiente' && $p['DesafioId'] === null) {
            rh_torneo_generar_duelo($conn, $torneo, $p);
        }
    }
}

function rh_torneo_cerrar_si_corresponde(mysqli $conn, int $torneoId): void
{
    $partidas = rh_torneo_partidas($conn, $torneoId);
    if (!$partidas) {
        return;
    }
    $rondaMax = max(array_map(fn ($p) => (int) $p['Ronda'], $partidas));
    $final = array_values(array_filter($partidas, fn ($p) => (int) $p['Ronda'] === $rondaMax));
    // La final es el único slot de la ronda más alta.
    foreach ($final as $p) {
        if ($p['Estado'] === 'terminada' || $p['Estado'] === 'bye') {
            $campeon = $p['GanadorUserId'] !== null ? (int) $p['GanadorUserId'] : null;
            if ($campeon !== null) {
                rh_torneo_coronar($conn, $torneoId, $campeon);
            }
        }
    }
}

function rh_torneo_cerrar_liga(mysqli $conn, int $torneoId): void
{
    $parts = rh_torneo_participantes($conn, $torneoId);
    if (!$parts) {
        return;
    }
    usort($parts, function ($x, $y) {
        if ((int) $x['PuntosLiga'] !== (int) $y['PuntosLiga']) {
            return (int) $y['PuntosLiga'] <=> (int) $x['PuntosLiga'];
        }
        return (int) $y['PartidasGanadas'] <=> (int) $x['PartidasGanadas'];
    });
    rh_torneo_coronar($conn, $torneoId, (int) $parts[0]['UserId']);
}

function rh_torneo_coronar(mysqli $conn, int $torneoId, int $campeonUserId): void
{
    $t = rh_torneo_obtener($conn, $torneoId);
    if (!$t || $t['Estado'] === 'terminado') {
        return;
    }
    $stmt = $conn->prepare("UPDATE Torneo SET Estado = 'terminado', GanadorUserId = ?, TerminadoEn = NOW() WHERE TorneoId = ?");
    $stmt->bind_param('ii', $campeonUserId, $torneoId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare(
        "UPDATE TorneoParticipante
            SET Estado = CASE WHEN UserId = ? THEN 'campeon' ELSE 'eliminado' END
          WHERE TorneoId = ?"
    );
    $stmt->bind_param('ii', $campeonUserId, $torneoId);
    $stmt->execute();
    $stmt->close();

    $parts = rh_torneo_participantes($conn, $torneoId);
    $ids = array_map(fn ($p) => (int) $p['UserId'], $parts);
    $nombreCampeon = rh_juego_nombre($conn, $campeonUserId);
    rh_notificar(
        $conn,
        $ids,
        'juego_torneo',
        'Terminó el torneo',
        $nombreCampeon . ' ganó ' . $t['Nombre'],
        '/(app)/hueplay/torneo/' . $torneoId,
        ['juegoCodigo' => $t['JuegoCodigo']]
    );
}

/** Torneo + participantes + llave/tabla + mi partida activa, para el front. */
function rh_torneo_serializar(mysqli $conn, array $t, int $yo): array
{
    $torneoId = (int) $t['TorneoId'];
    $parts = rh_torneo_participantes($conn, $torneoId);
    $partidas = rh_torneo_partidas($conn, $torneoId);

    $userIds = array_values(array_unique(array_map(fn ($p) => (int) $p['UserId'], $parts)));
    $usuarios = [];
    if ($userIds) {
        $ph = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $conn->prepare("SELECT UserId, NombreCompleto, Username, AvatarPath FROM Usuario WHERE UserId IN ($ph)");
        $stmt->bind_param(str_repeat('i', count($userIds)), ...$userIds);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($u = $res->fetch_assoc()) {
            $usuarios[(int) $u['UserId']] = $u;
        }
        $stmt->close();
    }
    $nom = fn ($uid) => $uid && isset($usuarios[$uid])
        ? ($usuarios[$uid]['Username'] ? '@' . $usuarios[$uid]['Username'] : $usuarios[$uid]['NombreCompleto'])
        : null;

    $participantes = array_map(fn ($p) => [
        'userId' => (int) $p['UserId'],
        'nombre' => $nom((int) $p['UserId']),
        'avatarPath' => $usuarios[(int) $p['UserId']]['AvatarPath'] ?? null,
        'estado' => $p['Estado'],
        'seed' => $p['Seed'] !== null ? (int) $p['Seed'] : null,
        'puntosLiga' => (int) $p['PuntosLiga'],
        'ganadas' => (int) $p['PartidasGanadas'],
        'perdidas' => (int) $p['PartidasPerdidas'],
        'esYo' => (int) $p['UserId'] === $yo,
    ], $parts);

    $miPartidaActiva = null;
    $partidasSer = array_map(function ($p) use ($nom, $yo, &$miPartidaActiva, $conn, $t) {
        $a = $p['UserIdA'] !== null ? (int) $p['UserIdA'] : null;
        $b = $p['UserIdB'] !== null ? (int) $p['UserIdB'] : null;
        $item = [
            'partidaId' => (int) $p['PartidaId'],
            'ronda' => (int) $p['Ronda'],
            'slot' => (int) $p['Slot'],
            'aUserId' => $a,
            'bUserId' => $b,
            'aNombre' => $nom($a),
            'bNombre' => $nom($b),
            'ganadorUserId' => $p['GanadorUserId'] !== null ? (int) $p['GanadorUserId'] : null,
            'estado' => $p['Estado'],
            'desafioId' => $p['DesafioId'] !== null ? (int) $p['DesafioId'] : null,
        ];
        if (
            $miPartidaActiva === null
            && $p['Estado'] === 'jugando'
            && $p['DesafioId'] !== null
            && ($a === $yo || $b === $yo)
        ) {
            $sem = 0;
            $st = $conn->prepare('SELECT Semilla FROM JuegoDesafio WHERE DesafioId = ?');
            $did = (int) $p['DesafioId'];
            $st->bind_param('i', $did);
            $st->execute();
            $row = $st->get_result()->fetch_assoc();
            $st->close();
            $sem = (int) ($row['Semilla'] ?? 0);
            $miPartidaActiva = [
                'desafioId' => (int) $p['DesafioId'],
                'ruta' => rh_hueplay_ruta_duelo($t['JuegoCodigo'], (int) $p['DesafioId'], $sem),
            ];
        }
        return $item;
    }, $partidas);

    return [
        'torneoId' => $torneoId,
        'juegoCodigo' => $t['JuegoCodigo'],
        'nombre' => $t['Nombre'],
        'formato' => $t['Formato'],
        'tamano' => (int) $t['Tamano'],
        'estado' => $t['Estado'],
        'codigoInvitacion' => $t['CodigoInvitacion'],
        'esPublico' => (bool) $t['EsPublico'],
        'rondaActual' => (int) $t['RondaActual'],
        'creadorUserId' => (int) $t['CreadorUserId'],
        'soyCreador' => (int) $t['CreadorUserId'] === $yo,
        'ganadorUserId' => $t['GanadorUserId'] !== null ? (int) $t['GanadorUserId'] : null,
        'ganadorNombre' => $nom($t['GanadorUserId'] !== null ? (int) $t['GanadorUserId'] : 0),
        'plazoTurnoSegundos' => (int) $t['PlazoTurnoSegundos'],
        'plazoRondaMinutos' => (int) $t['PlazoRondaMinutos'],
        'participantes' => $participantes,
        'partidas' => $partidasSer,
        'miPartidaActiva' => $miPartidaActiva,
        'creadoEn' => $t['CreatedAt'],
    ];
}
