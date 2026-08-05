<?php
/**
 * Cerrar mi lado de un duelo.
 *
 * Jugar es aceptar: no hay un paso previo de "aceptar el desafío". Cuando los
 * dos mandaron su puntaje, el duelo se resuelve solo acá mismo.
 *
 * Los puntos de la partida se suman igual al total de la cuenta, gane o pierda:
 * si sólo sumara el ganador, retar a alguien muy bueno sería un castigo y nadie
 * lo haría.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$puntos = (int) ($_POST['puntos'] ?? 0);
$duracion = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : null;

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

// Un duelo por turnos se juega con `turno_jugar.php`. Sin esta guarda se le
// podría mandar un puntaje inventado a un Conecta 4 y cerrarlo sin jugarlo.
if (($d['Modo'] ?? 'puntaje') === 'turnos') {
    json_error('Este duelo se juega por turnos');
}

$soyRetador = (int) $d['UserIdRetador'] === $userId;
$soyRetado = (int) $d['UserIdRetado'] === $userId;

if (!$soyRetador && !$soyRetado) {
    json_error('Este desafío no es tuyo', 403);
}
if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
    json_error('Este desafío ya está cerrado', 409);
}
if (strtotime($d['ExpiraEn']) <= time()) {
    json_error('El desafío venció', 409);
}

// Una sola partida por lado. Sin esto se puede reintentar hasta ganar, que es
// la forma más obvia de romper un duelo asincrónico.
$yaJugue = $soyRetador ? $d['PuntosRetador'] !== null : $d['PuntosRetado'] !== null;
if ($yaJugue) {
    json_error('Ya jugaste este desafío', 409);
}

$valido = rh_juego_puntaje_valido($d['JuegoCodigo'], $puntos, $duracion);
if ($valido === null) {
    json_error('Partida inválida');
}

$columna = $soyRetador ? 'PuntosRetador' : 'PuntosRetado';
$stmt = $conn->prepare(
    "UPDATE JuegoDesafio SET $columna = ?, Estado = 'aceptado' WHERE DesafioId = ? AND $columna IS NULL"
);
$stmt->bind_param('ii', $valido, $desafioId);
$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

// El `IS NULL` del WHERE es la guarda real contra dos envíos simultáneos: si
// otra request ya escribió el puntaje, esta no afecta ninguna fila.
if ($afectadas === 0) {
    json_error('Ya jugaste este desafío', 409);
}

$progreso = rh_juego_registrar_partida(
    $conn,
    $userId,
    $d['JuegoCodigo'],
    $valido,
    $duracion,
    $desafioId
);

// Releer: el rival pudo haber jugado mientras tanto.
$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

$cierre = rh_juego_resolver_desafio($conn, $d);

if ($cierre['cerrado']) {
    $retador = (int) $d['UserIdRetador'];
    $retado = (int) $d['UserIdRetado'];
    $ganador = $cierre['ganadorUserId'];

    if ($ganador === null) {
        rh_notificar($conn, [$retador, $retado], 'juego_desafio_fin', 'Empate en ' . rh_juego_titulo($d['JuegoCodigo']), 'El duelo terminó empatado', '/(app)/hueplay/desafios');
    } else {
        $perdedor = $ganador === $retador ? $retado : $retador;
        rh_notificar($conn, [$ganador], 'juego_desafio_fin', '¡Ganaste el duelo!', 'Le ganaste a ' . rh_juego_nombre($conn, $perdedor) . ' en ' . rh_juego_titulo($d['JuegoCodigo']), '/(app)/hueplay/desafios');
        rh_notificar($conn, [$perdedor], 'juego_desafio_fin', 'Perdiste el duelo', rh_juego_nombre($conn, $ganador) . ' te ganó en ' . rh_juego_titulo($d['JuegoCodigo']), '/(app)/hueplay/desafios');
    }

    // Se relee una vez más para que el estado y el ganador que vuelven sean los
    // ya escritos, no los de antes de resolver.
    $stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
    $stmt->bind_param('i', $desafioId);
    $stmt->execute();
    $d = $stmt->get_result()->fetch_assoc();
    $stmt->close();
} else {
    rh_notificar(
        $conn,
        [$soyRetador ? (int) $d['UserIdRetado'] : (int) $d['UserIdRetador']],
        'juego_desafio',
        'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya jugó su partida en ' . rh_juego_titulo($d['JuegoCodigo']),
        '/(app)/hueplay/desafios',
        ['actorUserId' => $userId]
    );
}

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'progreso' => $progreso,
]);
