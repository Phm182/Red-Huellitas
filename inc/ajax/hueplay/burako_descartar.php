<?php
/**
 * Descarta una ficha y cierra tu turno en HueBurako. Si es la primera vez
 * que te quedás sin fichas, recibís tu "muerto" y seguís (no termina la
 * ronda). Si ya lo habías comprado antes, cerrás la ronda: se calcula el
 * puntaje final de todos (`rh_burako_cerrar_ronda()`) y se cierra la sala.
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
$indice = isset($_POST['indice']) ? (int) $_POST['indice'] : -1;
if ($salaId <= 0) {
    json_error('Falta salaId');
}
if ($indice < 0) {
    json_error('Falta indice');
}

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

$resultado = rh_burako_descartar($estado, $miPosicion, $indice);
if ($resultado['error'] !== null) {
    json_error($resultado['error'], 409);
}

$estado = $resultado['estado'];
$tableroJson = json_encode($estado);
$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$jugadasIA = [];

if ($resultado['gano']) {
    rh_burako_cerrar_ronda($conn, $sala, $jugadores, $estado, true, $miPosicion);
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
} else {
    $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
    $siguiente = rh_sala_siguiente_jugador($activos, $miPosicion);
    if ($siguiente !== null) {
        rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
    }
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $cadena = rh_burako_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $cadena['sala'];
    $jugadores = $cadena['jugadores'];
    $jugadasIA = $cadena['jugadasIA'];
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoBurako = null;
if ($sala['Tablero'] !== null) {
    $estadoBurako = rh_burako_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
}

json_success([
    'sala' => $salaSerializada,
    'cartaDescartada' => $resultado['carta'],
    'gane' => $resultado['gano'],
    'jugadasIA' => $jugadasIA,
    'estadoBurako' => $estadoBurako,
]);
