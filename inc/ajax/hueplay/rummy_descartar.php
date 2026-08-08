<?php
/**
 * Descarta una carta y cierra tu turno. Si te quedás sin cartas en la mano,
 * ganaste la ronda; si no, el turno pasa al siguiente asiento y se
 * encadena lo que le toque jugar a la IA.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/rummy.php';

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

$resultado = rh_rummy_descartar($estado, $miPosicion, $indice);
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
    $puntos = [];
    foreach ($jugadores as $j) {
        $puntos[(int) $j['SalaJugadorId']] = rh_rummy_puntos((int) $j['SalaJugadorId'] === (int) $miAsiento['SalaJugadorId']);
    }
    rh_sala_cerrar($conn, $sala, $jugadores, (int) $miAsiento['SalaJugadorId'], $puntos);
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
} else {
    $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
    $siguiente = rh_sala_siguiente_jugador($activos, $miPosicion);
    if ($siguiente !== null) {
        rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoHoras']);
    }
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $cadena = rh_rummy_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $cadena['sala'];
    $jugadores = $cadena['jugadores'];
    $jugadasIA = $cadena['jugadasIA'];
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoRummy = null;
if ($sala['Tablero'] !== null) {
    $estadoRummy = rh_rummy_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
}

json_success([
    'sala' => $salaSerializada,
    'cartaDescartada' => $resultado['carta'],
    'gane' => $resultado['gano'],
    'jugadasIA' => $jugadasIA,
    'estadoRummy' => $estadoRummy,
]);
