<?php
/**
 * Roba una carta en HueRummy: del mazo, o del tope del descarte. Si no
 * queda de dónde robar (mazo vacío y el descarte con una sola carta), la
 * ronda se corta ahí mismo y gana quien tenga menos deadwood.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/rummy.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
$origen = trim($_POST['origen'] ?? 'mazo');
if ($salaId <= 0) {
    json_error('Falta salaId');
}
if (!in_array($origen, ['mazo', 'descarte'], true)) {
    json_error('Origen inválido');
}

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
if ($sala['TurnoVenceEn'] !== null && strtotime($sala['TurnoVenceEn']) <= time()) {
    json_error('El plazo de tu turno venció, actualizá la sala', 409);
}

$estado = json_decode($sala['Tablero'], true);
$miPosicion = (int) $miAsiento['Posicion'];

if (!rh_rummy_puede_robar($estado)) {
    $ganador = rh_rummy_ganador_por_deadwood($estado, $jugadores);
    $puntos = [];
    foreach ($jugadores as $j) {
        $puntos[(int) $j['SalaJugadorId']] = rh_rummy_puntos($ganador !== null && (int) $j['SalaJugadorId'] === $ganador);
    }
    rh_sala_cerrar($conn, $sala, $jugadores, $ganador, $puntos);
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    json_success([
        'sala' => rh_sala_serializar($conn, $sala, $jugadores, $userId),
        'carta' => null,
        'rondaCortada' => true,
        'estadoRummy' => rh_rummy_estado_visible(json_decode($sala['Tablero'], true), $miPosicion),
    ]);
}

$resultado = rh_rummy_robar($estado, $miPosicion, $origen);
if ($resultado['error'] !== null) {
    json_error($resultado['error'], 409);
}

$tableroJson = json_encode($resultado['estado']);
$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$sala = rh_sala_obtener($conn, $salaId);

json_success([
    'sala' => rh_sala_serializar($conn, $sala, $jugadores, $userId),
    'carta' => $resultado['carta'],
    'rondaCortada' => false,
    'estadoRummy' => rh_rummy_estado_visible($resultado['estado'], $miPosicion),
]);
