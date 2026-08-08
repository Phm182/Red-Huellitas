<?php
/**
 * Una jugada de Ajedrez: mover una pieza (o comer, enrocar, capturar al
 * paso, promocionar).
 *
 * El cliente manda sólo origen y destino; el servidor busca ese movimiento
 * entre los legales (los mismos que ya le mandó `ajedrez_ver.php`) y lo
 * aplica. A diferencia de Damas, acá no hace falta desambiguar por destino
 * repetido: en ajedrez cada par desde/hasta identifica un único movimiento
 * legal.
 *
 * Si el rival es la IA, su respuesta se resuelve en este mismo request.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/ajedrez.php';

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
if ($d['JuegoCodigo'] !== 'hueajedrez' || $d['Modo'] !== 'turnos') {
    json_error('Este duelo no es de Ajedrez');
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

$movimiento = null;
foreach (rh_ajedrez_movimientos_legales($tablero, $miLado) as $m) {
    if ($m['desde'] === ['fila' => $dFila, 'col' => $dCol] && $m['hasta'] === ['fila' => $hFila, 'col' => $hCol]) {
        $movimiento = $m;
        break;
    }
}

if ($movimiento === null) {
    json_error('Movimiento ilegal', 409);
}

$tablero = rh_ajedrez_aplicar($tablero, $movimiento);
$movimientos = (int) $d['Movimientos'] + 1;

$estadoRival = rh_ajedrez_termino($tablero, $rivalLado);
$gane = $estadoRival['terminado'] && $estadoRival['jaqueMate'];
$tablas = $estadoRival['terminado'] && !$estadoRival['jaqueMate'];
$jaque = !$estadoRival['terminado'] && rh_ajedrez_rey_en_jaque($tablero, $rivalLado);

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

if ($gane || $tablas) {
    $ganador = $gane ? $userId : null;
    $puntosRetador = rh_ajedrez_puntos($ganador === $retador, $tablas);
    $puntosRetado = rh_ajedrez_puntos($ganador === $retado, $tablas);
    $d['Tablero'] = $tablero;
    $resultado = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $resultado['progresoRetador'] : $resultado['progresoRetado'];
} elseif (rh_juego_es_bot($conn, $rival)) {
    // El bot responde en el mismo request: nunca hay polling esperándolo.
    $resultado = rh_ajedrez_turno_ia($tablero, $rivalLado);
    $tablero = $resultado['tablero'];
    $jugadaIA = $resultado['jugada'];
    $movimientos += $jugadaIA !== null ? 1 : 0;

    if ($resultado['terminoLado'] !== null || $resultado['tablas']) {
        $ganador = $resultado['tablas'] ? null : ($resultado['terminoLado'] === $miLado ? $rival : $userId);
        $perdiste = !$resultado['tablas'] && $ganador !== $userId;
        $puntosRetador = rh_ajedrez_puntos($ganador === $retador, $resultado['tablas']);
        $puntosRetado = rh_ajedrez_puntos($ganador === $retado, $resultado['tablas']);

        $stmt = $conn->prepare('UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ? WHERE DesafioId = ?');
        $stmt->bind_param('sii', $tablero, $movimientos, $desafioId);
        $stmt->execute();
        $stmt->close();

        $d['Tablero'] = $tablero;
        $resultadoCierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
        $progreso = $userId === $retador ? $resultadoCierre['progresoRetador'] : $resultadoCierre['progresoRetado'];
        $tablas = $resultado['tablas'];
    } else {
        $stmt = $conn->prepare(
            "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?, TurnoDeUserId = ?, Estado = 'aceptado' WHERE DesafioId = ?"
        );
        $stmt->bind_param('siii', $tablero, $movimientos, $userId, $desafioId);
        $stmt->execute();
        $stmt->close();
    }
} else {
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoHoras']);
    rh_notificar($conn, [$rival], 'juego_desafio', $jaque ? '¡Te hicieron jaque!' : 'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya movió en Ajedrez', '/(app)/hueplay/desafios',
        ['actorUserId' => $userId]);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'jugada' => [
        'desde' => $movimiento['desde'],
        'hasta' => $movimiento['hasta'],
        'captura' => $movimiento['capturaEn'],
        'enroque' => $movimiento['enroque'],
        'corono' => $movimiento['promocion'],
        'jaque' => $jaque,
    ],
    'jugadaIA' => $jugadaIA !== null ? [
        'desde' => $jugadaIA['desde'],
        'hasta' => $jugadaIA['hasta'],
        'captura' => $jugadaIA['capturaEn'],
        'enroque' => $jugadaIA['enroque'],
        'corono' => $jugadaIA['promocion'],
        'jaque' => rh_ajedrez_rey_en_jaque($tablero, $miLado),
    ] : null,
    'gane' => $gane,
    'perdiste' => $perdiste,
    'tablas' => $tablas,
    'progreso' => $progreso,
]);
