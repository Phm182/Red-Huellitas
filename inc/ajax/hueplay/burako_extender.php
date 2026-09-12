<?php
/**
 * Agrega fichas de tu mano a un meld ya bajado en la mesa de HueBurako
 * (propio o ajeno) — `rh_burako_extender_meld()`.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/rummy.php';
require_once __DIR__ . '/../../funciones/burako.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
$meldIndex = isset($_POST['meldIndex']) ? (int) $_POST['meldIndex'] : -1;
$indicesRaw = trim($_POST['indices'] ?? '');
if ($salaId <= 0) {
    json_error('Falta salaId');
}
if ($meldIndex < 0) {
    json_error('Falta meldIndex');
}
if ($indicesRaw === '') {
    json_error('Falta indices');
}
$indices = array_map('intval', explode(',', $indicesRaw));

$sala = rh_sala_obtener($conn, $salaId);
if (!$sala) {
    json_error('La sala no existe', 404);
}
if ($sala['JuegoCodigo'] !== 'hueburako') {
    json_error('Esa sala no es de HueBurako');
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

$resultado = rh_burako_extender_meld($estado, $miPosicion, $meldIndex, $indices);
if ($resultado['error'] !== null) {
    json_error($resultado['error'], 409);
}

$tableroJson = json_encode($resultado['estado']);
$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoBurako = rh_burako_estado_visible($resultado['estado'], $miPosicion);

json_success(['sala' => $salaSerializada, 'estadoBurako' => $estadoBurako]);
