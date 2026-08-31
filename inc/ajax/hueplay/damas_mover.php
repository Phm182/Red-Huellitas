<?php
/**
 * Una jugada de Damas: mover (o comer, o encadenar varias comidas) de una
 * casilla a otra.
 *
 * El cliente manda sólo el origen y el destino final; el servidor busca ese
 * movimiento entre los legales (los mismos que ya le mandó `damas_ver.php`) y
 * lo aplica. No hay forma de mandar un tablero ni un resultado: si el
 * movimiento no está entre los legales, se rechaza.
 *
 * Si el rival es la IA, su respuesta se resuelve en este mismo request: el
 * cliente recibe las dos jugadas (la propia y la del bot) en una sola vuelta,
 * sin necesitar un segundo pedido ni polling.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/damas.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$dFila = isset($_POST['dFila']) ? (int) $_POST['dFila'] : -1;
$dCol = isset($_POST['dCol']) ? (int) $_POST['dCol'] : -1;
$hFila = isset($_POST['hFila']) ? (int) $_POST['hFila'] : -1;
$hCol = isset($_POST['hCol']) ? (int) $_POST['hCol'] : -1;

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
if ($d['JuegoCodigo'] !== 'huedamas' || $d['Modo'] !== 'turnos') {
    json_error('Este duelo no es de Damas');
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

$miLado = $userId === $retador ? 1 : 2;
$rivalLado = $miLado === 1 ? 2 : 1;
$rival = $userId === $retador ? $retado : $retador;
$tablero = $d['Tablero'];

$legales = rh_damas_movimientos_legales($tablero, $miLado);
$candidatos = array_values(array_filter(
    $legales,
    fn (array $m) => $m['desde'] === ['fila' => $dFila, 'col' => $dCol]
        && $m['hasta'] === ['fila' => $hFila, 'col' => $hCol]
));

if (empty($candidatos)) {
    json_error('Movimiento ilegal', 409);
}

// Ambigüedad rara: dos cadenas distintas de captura que terminan en la misma
// casilla (posible con la dama voladora). Se desempata por la que come más.
usort($candidatos, fn (array $a, array $b) => count($b['saltos']) <=> count($a['saltos']));
$movimiento = $candidatos[0];

$tablero = rh_damas_aplicar($tablero, $movimiento);
$movimientos = (int) $d['Movimientos'] + 1;

$gane = rh_damas_termino($tablero, $rivalLado);

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

$jugadaIA = null;
$progreso = null;
$perdiste = false;

if ($gane) {
    $puntosRetador = rh_damas_puntos($userId === $retador);
    $puntosRetado = rh_damas_puntos($userId === $retado);
    $d['Tablero'] = $tablero;
    $resultado = rh_juego_cerrar_desafio_turnos($conn, $d, $userId, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $resultado['progresoRetador'] : $resultado['progresoRetado'];
} elseif (rh_juego_es_bot($conn, $rival)) {
    // El bot responde en el mismo request: nunca hay polling esperándolo.
    $resultado = rh_damas_turno_ia($tablero, $rivalLado);
    $tablero = $resultado['tablero'];
    $jugadaIA = $resultado['jugada'];
    $movimientos += $jugadaIA !== null ? 1 : 0;

    if ($resultado['terminoLado'] !== null) {
        // terminoLado === miLado -> perdí yo; terminoLado === rivalLado -> el
        // bot se quedó sin movimiento propio (no debería pasar, se cubre igual).
        $ganador = $resultado['terminoLado'] === $miLado ? $rival : $userId;
        $perdiste = $ganador !== $userId;
        $puntosRetador = rh_damas_puntos($ganador === $retador);
        $puntosRetado = rh_damas_puntos($ganador === $retado);

        $stmt = $conn->prepare('UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ? WHERE DesafioId = ?');
        $stmt->bind_param('sii', $tablero, $movimientos, $desafioId);
        $stmt->execute();
        $stmt->close();

        $d['Tablero'] = $tablero;
        $resultadoCierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
        $progreso = $userId === $retador ? $resultadoCierre['progresoRetador'] : $resultadoCierre['progresoRetado'];
    } else {
        $stmt = $conn->prepare(
            "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?, TurnoDeUserId = ?, Estado = 'aceptado' WHERE DesafioId = ?"
        );
        $stmt->bind_param('siii', $tablero, $movimientos, $userId, $desafioId);
        $stmt->execute();
        $stmt->close();
    }
} else {
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoMinutos']);
    rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya movió en Damas', '/(app)/hueplay/desafios',
        ['actorUserId' => $userId]);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'jugada' => ['saltos' => $movimiento['saltos'], 'corono' => $movimiento['corona'] ? $movimiento['hasta'] : null],
    'jugadaIA' => $jugadaIA !== null ? ['saltos' => $jugadaIA['saltos'], 'corono' => $jugadaIA['corona'] ? $jugadaIA['hasta'] : null] : null,
    'gane' => $gane,
    'perdiste' => $perdiste,
    'progreso' => $progreso,
]);
