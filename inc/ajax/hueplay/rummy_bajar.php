<?php
/**
 * Baja un meld nuevo (set o run) con cartas de tu mano, ya robada la carta
 * del turno. Se puede llamar varias veces en el mismo turno para bajar más
 * de un meld antes de descartar.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/rummy.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
$indicesRaw = trim($_POST['indices'] ?? '');
if ($salaId <= 0) {
    json_error('Falta salaId');
}
if ($indicesRaw === '') {
    json_error('Falta indices');
}
$indices = array_map('intval', explode(',', $indicesRaw));

$sala = rh_sala_obtener($conn, $salaId);
if (!$sala) {
    json_error('La sala no existe', 404);
}
if ($sala['JuegoCodigo'] !== 'huerummy') {
    json_error('Esa sala no es de HueRummy');
}

$jugadores = rh_sala_jugadores($conn, $salaId);
$miAsiento = null;
foreach ($jugadores as $j) {
    if ((int) $j['UserId'] === $userId) {
        $miAsiento = $j;
        break;
    }
}
if (!$miAsiento) {
    json_error('Esta sala no es tuya', 403);
}
if ($sala['Estado'] !== 'jugando') {
    json_error('Esta partida no está en curso', 409);
}
if ((int) $sala['TurnoDeSalaJugadorId'] !== (int) $miAsiento['SalaJugadorId']) {
    json_error('No es tu turno', 409);
}

$estado = json_decode($sala['Tablero'], true);
$miPosicion = (int) $miAsiento['Posicion'];

$resultado = rh_rummy_bajar_meld($estado, $miPosicion, $indices);
if ($resultado['error'] !== null) {
    json_error($resultado['error'], 409);
}

$tableroJson = json_encode($resultado['estado']);
$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoRummy = rh_rummy_estado_visible($resultado['estado'], $miPosicion);

json_success(['sala' => $salaSerializada, 'estadoRummy' => $estadoRummy]);
