<?php
/**
 * Aplica el movimiento elegido con los dados ya tirados (`ludoroyal_tirar.php`).
 * El cliente sólo manda con qué ficha jugar — el numérico y el símbolo los
 * tiene el servidor guardados (`dadoPendiente`/`simboloPendiente`), nunca se
 * confía en lo que informe el cliente.
 *
 * Si hay turno extra (SÓLO Corona, ver `rh_ludoroyal_da_turno_extra()`) el
 * turno sigue siendo tuyo: no se avanza y el cliente vuelve a llamar a
 * `ludoroyal_tirar.php`. Si no, se pasa el turno y se encadena la IA.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/ludoroyal.php';

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
if ($sala['JuegoCodigo'] !== 'hueludoroyal') {
    json_error('Esa sala no es de HueLudo Real');
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
if (!is_array($estado) || !isset($estado['fichas']) || !is_array($estado['fichas'])) {
    json_error('El tablero de esta sala quedó en un estado inválido, volvé a intentar', 500);
}
$miPosicion = (int) $miAsiento['Posicion'];
$dado = $estado['dadoPendiente'] ?? null;
$simbolo = (string) ($estado['simboloPendiente'] ?? 'vacio');

if ($dado === null) {
    json_error('Primero tenés que tirar los dados', 409);
}

$legales = rh_ludoroyal_movimientos_legales($estado, $miPosicion, (int) $dado, $simbolo);
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

$aplicado = rh_ludoroyal_aplicar($estado, $elegido);
$estado = $aplicado['estado'];
$estado['dadoPendiente'] = null;
$estado['simboloPendiente'] = null;
$tableroJson = json_encode($estado);

$stmt = $conn->prepare('UPDATE JuegoSala SET Tablero = ? WHERE SalaId = ?');
$stmt->bind_param('si', $tableroJson, $salaId);
$stmt->execute();
$stmt->close();

$jugada = [
    'salaJugadorId' => (int) $miAsiento['SalaJugadorId'],
    'jugadas' => [[
        'dadoNumerico' => (int) $dado,
        'simbolo' => $simbolo,
        'ficha' => ['jugador' => $miPosicion, 'num' => $fichaNum],
        'desde' => $elegido['desde'],
        'hasta' => $elegido['hasta'],
        'capturadas' => $aplicado['capturadas'],
    ]],
];

$gano = rh_ludo_gano($estado, $miPosicion);
$jugadasIA = [];
$turnoExtra = rh_ludoroyal_da_turno_extra($simbolo);

if ($gano) {
    $puntos = [];
    foreach ($jugadores as $j) {
        $puntos[(int) $j['SalaJugadorId']] = rh_ludoroyal_puntos((int) $j['SalaJugadorId'] === (int) $miAsiento['SalaJugadorId']);
    }
    rh_sala_cerrar($conn, $sala, $jugadores, (int) $miAsiento['SalaJugadorId'], $puntos);
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
} elseif ($turnoExtra) {
    // Turno extra: se refresca el plazo para que la tirada de más tenga el
    // mismo tiempo completo que cualquier otra.
    rh_sala_avanzar_turno($conn, $salaId, (int) $miAsiento['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
    $sala = rh_sala_obtener($conn, $salaId);
} else {
    $activos = array_values(array_filter($jugadores, fn ($j) => $j['Estado'] === 'jugando'));
    $siguiente = rh_sala_siguiente_jugador($activos, $miPosicion);
    if ($siguiente !== null) {
        rh_sala_avanzar_turno($conn, $salaId, (int) $siguiente['SalaJugadorId'], (int) $sala['PlazoTurnoSegundos']);
    }
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    $cadena = rh_ludoroyal_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
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
