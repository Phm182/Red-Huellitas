<?php
/**
 * Tira el dado en una sala de HueLudo. Si con ese valor no hay ninguna
 * jugada posible (todo en el corral y no salió 6, o perdió el turno por 3
 * seises seguidos), el turno pasa acá mismo — el cliente no tiene que
 * mandar un "paso" aparte — y se encadena de una lo que le toque jugar a la
 * IA después, mismo criterio que en todo el resto de HuePlay.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/ludo.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta salaId');
}

$sala = rh_sala_obtener($conn, $salaId);
if (!$sala) {
    json_error('La sala no existe', 404);
}
if ($sala['JuegoCodigo'] !== 'hueludo') {
    json_error('Esa sala no es de HueLudo');
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

if (($estado['dadoPendiente'] ?? null) !== null) {
    // Ya había tirado antes (reintento del cliente): no se vuelve a tirar,
    // se devuelven las mismas opciones para que elija con qué ficha jugar.
    $dado = (int) $estado['dadoPendiente'];
    $salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
    $salaSerializada['tablero'] = $sala['Tablero'];
    json_success([
        'sala' => $salaSerializada,
        'dado' => $dado,
        'movimientosLegales' => rh_ludo_movimientos_legales($estado, $miPosicion, $dado),
        'pasoElTurno' => false,
        'jugadasIA' => [],
    ]);
}

$resultado = rh_ludo_tirar_y_calcular($estado, $miPosicion);
$estado = $resultado['estado'];
$tableroJson = json_encode($estado);

$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$jugadasIA = [];

if (empty($resultado['movimientosLegales'])) {
    // Nada para jugar con este número: pasa el turno ahí mismo.
    $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
    $siguiente = rh_sala_siguiente_jugador($activos, $miPosicion);
    if ($siguiente !== null) {
        rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoHoras']);
    }
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $cadena = rh_ludo_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $cadena['sala'];
    $jugadores = $cadena['jugadores'];
    $jugadasIA = $cadena['jugadasIA'];
} else {
    $sala = rh_sala_obtener($conn, $salaId);
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$salaSerializada['tablero'] = $sala['Tablero'];

json_success([
    'sala' => $salaSerializada,
    'dado' => $resultado['dado'],
    'movimientosLegales' => $resultado['movimientosLegales'],
    'pasoElTurno' => empty($resultado['movimientosLegales']),
    'jugadasIA' => $jugadasIA,
]);
