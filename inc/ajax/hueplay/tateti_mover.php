<?php
/**
 * Una jugada de HueTaTeTi: colocar una ficha nueva en (fila,col). Igual
 * forma que `reversi_mover.php` (sin "desde", el cliente sólo manda el
 * destino), pero sin la complicación del turno salteado: en TaTeTi si a
 * alguien no le tocaría jugar es porque el tablero ya está lleno, y eso ya
 * es empate.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/tateti.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
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
if ($d['JuegoCodigo'] !== 'huetateti' || $d['Modo'] !== 'turnos') {
    json_error('Este duelo no es de HueTaTeTi');
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

$legales = rh_tateti_movimientos_legales($tablero, $miLado);
$movimiento = null;
foreach ($legales as $m) {
    if ($m['fila'] === $hFila && $m['col'] === $hCol) {
        $movimiento = $m;
        break;
    }
}
if ($movimiento === null) {
    json_error('Movimiento ilegal', 409);
}

$tablero = rh_tateti_aplicar($tablero, $movimiento['fila'], $movimiento['col'], $miLado);
$movimientos = (int) $d['Movimientos'] + 1;

$gane = rh_tateti_gano($tablero, $miLado);
$empate = !$gane && rh_tateti_empatado($tablero);

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

if ($gane || $empate) {
    $ganador = $gane ? $userId : null;
    $puntosRetador = rh_tateti_puntos($ganador === $retador, $empate);
    $puntosRetado = rh_tateti_puntos($ganador === $retado, $empate);
    $d['Tablero'] = $tablero;
    $resultado = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $resultado['progresoRetador'] : $resultado['progresoRetado'];
} elseif (rh_juego_es_bot($conn, $rival)) {
    // El bot responde en el mismo request: nunca hay polling esperándolo.
    $resultado = rh_tateti_turno_ia($tablero, $rivalLado);
    $tablero = $resultado['tablero'] ?? $tablero;
    $jugadaIA = $resultado['jugada'] ?? null;
    $movimientos += $jugadaIA !== null ? 1 : 0;

    $ganoBot = $jugadaIA !== null && rh_tateti_gano($tablero, $rivalLado);
    $empateBot = !$ganoBot && rh_tateti_empatado($tablero);

    if ($ganoBot || $empateBot) {
        $ganador = $ganoBot ? $rival : null;
        $perdiste = $ganador === $rival;
        $puntosRetador = rh_tateti_puntos($ganador === $retador, $empateBot);
        $puntosRetado = rh_tateti_puntos($ganador === $retado, $empateBot);

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
    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoMinutos'], $d['JuegoCodigo']);
    rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya movió en HueTaTeTi', '/(app)/hueplay/desafios',
        ['actorUserId' => $userId, 'juegoCodigo' => $d['JuegoCodigo']]);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'jugada' => $movimiento,
    'jugadaIA' => $jugadaIA,
    'gane' => $gane,
    'empate' => $empate,
    'perdiste' => $perdiste,
    'progreso' => $progreso,
]);
