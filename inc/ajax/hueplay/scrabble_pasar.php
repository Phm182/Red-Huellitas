<?php
/**
 * Pasa el turno en HueScrabble sin jugar ni cambiar fichas. Si todos pasan
 * dos veces seguidas, la partida se cierra sola (`rh_scrabble_terminado()`).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/scrabble.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta salaId');
}

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

$estado = rh_scrabble_pasar($estado, $miPosicion);
$tableroJson = json_encode($estado);
$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$jugadasIA = [];
$terminada = false;

if (rh_scrabble_terminado($estado)) {
    $finales = rh_scrabble_puntajes_finales($estado);
    $ganadorPos = null;
    $mejorPuntaje = -1;
    $empatado = false;
    foreach ($finales as $pos => $p) {
        if ($p > $mejorPuntaje) {
            $mejorPuntaje = $p;
            $ganadorPos = $pos;
            $empatado = false;
        } elseif ($p === $mejorPuntaje) {
            $empatado = true;
        }
    }
    $puntosPorAsiento = [];
    $ganadorSalaJugadorId = null;
    foreach ($jugadores as $j) {
        $pos = (int) $j['Posicion'];
        $puntosPorAsiento[(int) $j['SalaJugadorId']] = $finales[$pos] ?? 0;
        if (!$empatado && $pos === $ganadorPos) {
            $ganadorSalaJugadorId = (int) $j['SalaJugadorId'];
        }
    }
    rh_sala_cerrar($conn, $sala, $jugadores, $ganadorSalaJugadorId, $puntosPorAsiento);
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $terminada = true;
} else {
    $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
    $siguiente = rh_sala_siguiente_jugador($activos, $miPosicion);
    if ($siguiente !== null) {
        rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoMinutos']);
    }
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $cadena = rh_scrabble_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $cadena['sala'];
    $jugadores = $cadena['jugadores'];
    $jugadasIA = $cadena['jugadasIA'];
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoScrabble = null;
if ($sala['Tablero'] !== null) {
    $estadoScrabble = rh_scrabble_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
}

json_success([
    'sala' => $salaSerializada,
    'terminada' => $terminada,
    'jugadasIA' => $jugadasIA,
    'estadoScrabble' => $estadoScrabble,
]);
