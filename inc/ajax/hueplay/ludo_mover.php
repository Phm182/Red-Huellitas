<?php
/**
 * Aplica el movimiento elegido con el dado ya tirado (`ludo_tirar.php`). El
 * cliente sólo manda con qué ficha jugar — el valor del dado lo tiene el
 * servidor guardado en `dadoPendiente`, nunca se confía en lo que informe
 * el cliente.
 *
 * Si sacó 6 (y no fue el 3er 6 seguido) el turno sigue siendo tuyo: no se
 * avanza y el cliente vuelve a llamar a `ludo_tirar.php`. Si no, se pasa el
 * turno y se encadena lo que le toque jugar a la IA.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/ludo.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
$fichaNum = (int) ($_POST['fichaNum'] ?? -1);

if ($salaId <= 0) {
    json_error('Falta salaId');
}
if ($fichaNum < 0 || $fichaNum > 3) {
    json_error('Falta fichaNum');
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

$estado = json_decode($sala['Tablero'], true);
$miPosicion = (int) $miAsiento['Posicion'];
$dado = $estado['dadoPendiente'] ?? null;

if ($dado === null) {
    json_error('Primero tenés que tirar el dado', 409);
}

$legales = rh_ludo_movimientos_legales($estado, $miPosicion, (int) $dado);
$elegido = null;
foreach ($legales as $mov) {
    if ($mov['ficha']['num'] === $fichaNum) {
        $elegido = $mov;
        break;
    }
}
if ($elegido === null) {
    json_error('Ese movimiento no es válido', 409);
}

$aplicado = rh_ludo_aplicar($estado, $elegido);
$estado = $aplicado['estado'];
$estado['dadoPendiente'] = null;
$tableroJson = json_encode($estado);

$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$jugada = [
    'salaJugadorId' => (int) $miAsiento['SalaJugadorId'],
    'jugadas' => [[
        'dado' => (int) $dado,
        'ficha' => ['jugador' => $miPosicion, 'num' => $fichaNum],
        'desde' => $elegido['desde'],
        'hasta' => $elegido['hasta'],
        'capturadas' => $aplicado['capturadas'],
    ]],
];

$gano = rh_ludo_gano($estado, $miPosicion);
$jugadasIA = [];

if ($gano) {
    $puntos = [];
    foreach ($jugadores as $j) {
        $puntos[(int) $j['SalaJugadorId']] = rh_ludo_puntos((int) $j['SalaJugadorId'] === (int) $miAsiento['SalaJugadorId']);
    }
    rh_sala_cerrar($conn, $sala, $jugadores, (int) $miAsiento['SalaJugadorId'], $puntos);
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
} elseif ((int) $dado === 6) {
    // Sacó 6: sigue siendo tu turno. Se refresca el plazo para que la
    // tirada extra tenga el mismo tiempo completo que cualquier otra.
    rh_sala_avanzar_turno($conn, $salaId, (int) $miAsiento['SalaJugadorId'], (int) $sala['PlazoTurnoHoras']);
    $sala = rh_sala_obtener($conn, $salaId);
} else {
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
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$salaSerializada['tablero'] = $sala['Tablero'];

json_success([
    'sala' => $salaSerializada,
    'jugada' => $jugada,
    'gane' => $gano,
    'jugadasIA' => $jugadasIA,
]);
