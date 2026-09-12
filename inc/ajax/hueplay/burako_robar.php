<?php
/**
 * Roba una ficha en HueBurako: del mazo, o TODO el pozo del descarte (regla
 * del reglamento, distinta de HueRummy que sólo levanta el tope). Si no
 * queda de dónde robar, la ronda se cierra: "cierre sin canasta" (nadie
 * armó ninguna Canasta — se juega de vuelta, sin puntaje) o "terminan las
 * fichas" (alguien sí tiene Canasta — se puntúa normal, sin el bono de
 * cierre) según el reglamento.
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
if ($sala['TurnoVenceEn'] !== null && strtotime($sala['TurnoVenceEn']) <= time()) {
    json_error('El plazo de tu turno venció, actualizá la sala', 409);
}

$estado = json_decode($sala['Tablero'], true);
$miPosicion = (int) $miAsiento['Posicion'];

if (!rh_burako_puede_robar($estado)) {
    $huboCanasta = false;
    foreach ($estado['melds'] as $m) {
        if (rh_burako_tipo_canasta($m['cartas']) !== null) {
            $huboCanasta = true;
            break;
        }
    }
    if ($huboCanasta) {
        rh_burako_cerrar_ronda($conn, $sala, $jugadores, $estado, false, null);
    } else {
        $puntosCuenta = [];
        foreach ($jugadores as $j) {
            $puntosCuenta[(int) $j['SalaJugadorId']] = rh_burako_puntos(false);
        }
        rh_sala_cerrar($conn, $sala, $jugadores, null, $puntosCuenta);
    }
    $sala = rh_sala_obtener($conn, $salaId);
    $jugadores = rh_sala_jugadores($conn, $salaId);
    json_success([
        'sala' => rh_sala_serializar($conn, $sala, $jugadores, $userId),
        'carta' => null,
        'rondaCortada' => true,
        'estadoBurako' => rh_burako_estado_visible(json_decode($sala['Tablero'] ?? 'null', true) ?? $estado, $miPosicion),
    ]);
}

$resultado = rh_burako_robar($estado, $miPosicion, $origen);
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
    'estadoBurako' => rh_burako_estado_visible($resultado['estado'], $miPosicion),
]);
