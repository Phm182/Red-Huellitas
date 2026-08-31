<?php
/**
 * Una jugada de HueConecta: soltar una ficha en una columna.
 *
 * Todo se valida acá: que el duelo siga abierto, que sea tu turno, que la
 * columna exista y que le quede lugar. El cliente manda un número de columna y
 * nada más; no puede informar un tablero ni un resultado.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/hueconecta.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$columna = isset($_POST['columna']) ? (int) $_POST['columna'] : -1;

if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$d) {
    json_error('El desafío no existe', 404);
}
if ($d['Modo'] !== 'turnos') {
    json_error('Este duelo no se juega por turnos');
}

$retador = (int) $d['UserIdRetador'];
$retado = (int) $d['UserIdRetado'];

if ($userId !== $retador && $userId !== $retado) {
    json_error('Este desafío no es tuyo', 403);
}
if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
    json_error('Este duelo ya terminó', 409);
}
if (strtotime($d['ExpiraEn']) <= time()) {
    json_error('El desafío venció', 409);
}
if ((int) $d['TurnoDeUserId'] !== $userId) {
    json_error('No es tu turno', 409);
}

$ficha = $userId === $retador ? '1' : '2';
$soltada = rh_c4_soltar($d['Tablero'], $columna, $ficha);

if ($soltada === null) {
    json_error('Esa columna no existe o ya está llena');
}

$tablero = $soltada['tablero'];
$fila = $soltada['fila'];
$movimientos = (int) $d['Movimientos'] + 1;

$gano = rh_c4_gano($tablero, $fila, $columna);
$empate = !$gano && rh_c4_lleno($tablero);
$rival = $userId === $retador ? $retado : $retador;

// Paso 1: persistir el tablero. El `WHERE TurnoDeUserId = ?` es el guard de
// concurrencia: si dos jugadas llegaran a la vez, la segunda no encuentra fila.
$stmt = $conn->prepare(
    "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?
      WHERE DesafioId = ? AND TurnoDeUserId = ? AND Estado IN ('pendiente','aceptado')"
);
$stmt->bind_param('siii', $tablero, $movimientos, $desafioId, $userId);
$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

if ($afectadas === 0) {
    json_error('No es tu turno', 409);
}

$progreso = null;

// Paso 2: cerrar o pasar el turno.
if ($gano || $empate) {
    $ganador = $gano ? $userId : null;
    $puntosRetador = rh_c4_puntos($userId === $retador && $gano, $empate);
    $puntosRetado = rh_c4_puntos($userId === $retado && $gano, $empate);

    $d['Tablero'] = $tablero; // para que rh_juego_cerrar_desafio_turnos vea el tablero final
    $resultado = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $resultado['progresoRetador'] : $resultado['progresoRetado'];
} else {
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoMinutos']);

    if (!rh_juego_es_bot($conn, $rival)) {
        rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
            rh_juego_nombre($conn, $userId) . ' ya movió en HueConecta', '/(app)/hueplay/desafios',
            ['actorUserId' => $userId]);
    }
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'ultimaJugada' => ['fila' => $fila, 'columna' => $columna],
    'lineaGanadora' => $gano ? rh_c4_linea_ganadora($tablero, $fila, $columna) : [],
    'columnasLibres' => rh_c4_columnas_libres($tablero),
    'gane' => $gano,
    'empate' => $empate,
    'progreso' => $progreso,
]);
