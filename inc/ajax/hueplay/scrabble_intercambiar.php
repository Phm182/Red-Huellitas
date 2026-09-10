<?php
/**
 * Cambia fichas del atril por otras de la bolsa en HueScrabble. Cuenta como
 * el turno completo (no se puede jugar Y cambiar en el mismo turno) — a
 * diferencia de pasar, resetea `pasesConsecutivos` (ver el comentario en
 * `rh_scrabble_intercambiar()`).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/scrabble.php';

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
if ($sala['JuegoCodigo'] !== 'huescrabble') {
    json_error('Esa sala no es de HueScrabble');
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

$resultado = rh_scrabble_intercambiar($estado, $miPosicion, $indices);
if ($resultado['error'] !== null) {
    json_error($resultado['error'], 409);
}

$estado = $resultado['estado'];
$tableroJson = json_encode($estado);
$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

// Intercambiar nunca termina la partida (bolsa no vacía es requisito para
// poder hacerlo), así que siempre se pasa el turno al que sigue.
$activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
$siguiente = rh_sala_siguiente_jugador($activos, $miPosicion);
if ($siguiente !== null) {
    rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
}
$sala = rh_sala_obtener($conn, $salaId);
$jugadores = rh_sala_jugadores($conn, $salaId);
$cadena = rh_scrabble_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
$sala = $cadena['sala'];
$jugadores = $cadena['jugadores'];
$jugadasIA = $cadena['jugadasIA'];

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoScrabble = null;
if ($sala['Tablero'] !== null) {
    $estadoScrabble = rh_scrabble_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
}

json_success([
    'sala' => $salaSerializada,
    'jugadasIA' => $jugadasIA,
    'estadoScrabble' => $estadoScrabble,
]);
