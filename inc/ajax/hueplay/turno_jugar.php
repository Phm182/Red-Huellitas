<?php
/**
 * Una jugada de HueConecta: soltar una ficha en una columna.
 *
 * Todo se valida acá: que el duelo siga abierto, que sea tu turno, que la
 * columna exista y que le quede lugar. El cliente manda un número de columna y
 * nada más; no puede informar un tablero ni un resultado.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/hueconecta.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$columna = isset($_POST['columna']) ? (int) $_POST['columna'] : -1;

if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$d) {
    json_error('El desafío no existe', 404);
}
if ($d['Modo'] !== 'turnos') {
    json_error('Este duelo no se juega por turnos');
}

$retador = (int) $d['UserIdRetador'];
$retado = (int) $d['UserIdRetado'];

if ($userId !== $retador && $userId !== $retado) {
    json_error('Este desafío no es tuyo', 403);
}
if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
    json_error('Este duelo ya terminó', 409);
}
if (strtotime($d['ExpiraEn']) <= time()) {
    json_error('El desafío venció', 409);
}
if ((int) $d['TurnoDeUserId'] !== $userId) {
    json_error('No es tu turno', 409);
}

$ficha = $userId === $retador ? '1' : '2';
$soltada = rh_c4_soltar($d['Tablero'], $columna, $ficha);

if ($soltada === null) {
    json_error('Esa columna no existe o ya está llena');
}

$tablero = $soltada['tablero'];
$fila = $soltada['fila'];
$movimientos = (int) $d['Movimientos'] + 1;

$gano = rh_c4_gano($tablero, $fila, $columna);
$empate = !$gano && rh_c4_lleno($tablero);
$rival = $userId === $retador ? $retado : $retador;

if ($gano || $empate) {
    $ganador = $gano ? $userId : null;

    // El turno se pone en NULL al cerrar: dejarlo apuntando a alguien haría que
    // la bandeja mostrara "te toca" en un duelo terminado.
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio
            SET Tablero = ?, Movimientos = ?, TurnoDeUserId = NULL,
                Estado = 'terminado', GanadorUserId = ?
          WHERE DesafioId = ? AND TurnoDeUserId = ?"
    );
    $stmt->bind_param('siiii', $tablero, $movimientos, $ganador, $desafioId, $userId);
} else {
    // El `TurnoDeUserId = ?` del WHERE es la guarda contra dos jugadas
    // simultáneas: si el turno ya cambió, esta no afecta ninguna fila.
    // También se corre el vencimiento: un duelo activo no debería morirse.
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio
            SET Tablero = ?, Movimientos = ?, TurnoDeUserId = ?, Estado = 'aceptado',
                ExpiraEn = DATE_ADD(NOW(), INTERVAL " . RH_DESAFIO_DIAS . " DAY)
          WHERE DesafioId = ? AND TurnoDeUserId = ?"
    );
    $stmt->bind_param('siiii', $tablero, $movimientos, $rival, $desafioId, $userId);
}

$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

if ($afectadas === 0) {
    json_error('No es tu turno', 409);
}

$progreso = null;

if ($gano || $empate) {
    // Los puntos los reparte el servidor. Pierda o gane, cada uno suma algo.
    $puntosYo = rh_c4_puntos($gano, $empate);
    $puntosRival = rh_c4_puntos(false, $empate);

    $progreso = rh_juego_registrar_partida($conn, $userId, 'hueconecta', $puntosYo, null, $desafioId);
    rh_juego_registrar_partida($conn, $rival, 'hueconecta', $puntosRival, null, $desafioId);

    if ($gano) {
        rh_juego_perfil($conn, $userId);
        rh_juego_perfil($conn, $rival);

        $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosGanados = DesafiosGanados + 1 WHERE UserId = ?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare('UPDATE UsuarioJuegoPerfil SET DesafiosPerdidos = DesafiosPerdidos + 1 WHERE UserId = ?');
        $stmt->bind_param('i', $rival);
        $stmt->execute();
        $stmt->close();

        rh_notificar($conn, [$rival], 'juego_desafio_fin', 'Perdiste el duelo',
            rh_juego_nombre($conn, $userId) . ' te ganó en HueConecta', '/(app)/hueplay/desafios');
    } else {
        rh_notificar($conn, [$rival], 'juego_desafio_fin', 'Empate en HueConecta',
            'El tablero se llenó sin ganador', '/(app)/hueplay/desafios');
    }
} else {
    rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya movió en HueConecta', '/(app)/hueplay/desafios',
        ['actorUserId' => $userId]);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'ultimaJugada' => ['fila' => $fila, 'columna' => $columna],
    'lineaGanadora' => $gano ? rh_c4_linea_ganadora($tablero, $fila, $columna) : [],
    'columnasLibres' => rh_c4_columnas_libres($tablero),
    'gane' => $gano,
    'empate' => $empate,
    'progreso' => $progreso,
]);
