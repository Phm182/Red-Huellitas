<?php
/**
 * Arranca la partida: sólo quien creó la sala, con mínimo 2 aceptados.
 * Completa con IA si corresponde, arma el tablero inicial (según el juego)
 * y resuelve de entrada los turnos que le toquen a un asiento IA.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/ludo.php';
require_once __DIR__ . '/../../funciones/rummy.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta salaId');
}

$preparado = rh_sala_iniciar_preparar($conn, $salaId, $userId);
if (isset($preparado['error'])) {
    json_error($preparado['error'], 409);
}

$sala = $preparado['sala'];
$jugadores = $preparado['jugadores'];
$juegoCodigo = $sala['JuegoCodigo'];

if ($juegoCodigo === 'hueludo') {
    $tablero = rh_ludo_inicial(count($jugadores));
} elseif ($juegoCodigo === 'huerummy') {
    $tablero = rh_rummy_inicial(count($jugadores));
} else {
    json_error('Juego de sala desconocido');
}

usort($jugadores, fn ($a, $b) => (int) $a['Posicion'] <=> (int) $b['Posicion']);
$primerTurno = (int) $jugadores[0]['SalaJugadorId'];
$plazo = (int) $sala['PlazoTurnoHoras'];

$stmt = $conn->prepare(
    "UPDATE JuegoSala
        SET Tablero = ?, Estado = 'jugando', TurnoDeSalaJugadorId = ?,
            TurnoVenceEn = DATE_ADD(NOW(), INTERVAL ? HOUR), IniciadaEn = NOW()
      WHERE SalaId = ?"
);
$stmt->bind_param('siii', $tablero, $primerTurno, $plazo, $salaId);
$stmt->execute();
$stmt->close();

$humanos = array_values(array_filter($jugadores, fn ($j) => !rh_juego_es_bot($conn, (int) $j['UserId'])));
$humanoIds = array_map(fn ($j) => (int) $j['UserId'], $humanos);
if ($humanoIds) {
    $otros = array_values(array_filter($humanoIds, fn ($id) => $id !== $userId));
    if ($otros) {
        rh_notificar($conn, $otros, 'juego_desafio', 'Arrancó la partida',
            rh_juego_nombre($conn, $userId) . ' inició la sala de ' . rh_juego_titulo($juegoCodigo),
            '/(app)/hueplay/desafios');
    }
}

$sala = rh_sala_obtener($conn, $salaId);
$jugadores = rh_sala_jugadores($conn, $salaId);

$jugadasIA = [];
if ($juegoCodigo === 'hueludo') {
    $resultado = rh_ludo_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
} elseif ($juegoCodigo === 'huerummy') {
    $resultado = rh_rummy_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoRummy = null;

if ($juegoCodigo === 'hueludo') {
    $salaSerializada['tablero'] = $sala['Tablero'];
} elseif ($juegoCodigo === 'huerummy' && $salaSerializada['miAsientoId'] !== null) {
    $miPosicion = null;
    foreach ($jugadores as $j) {
        if ((int) $j['SalaJugadorId'] === $salaSerializada['miAsientoId']) {
            $miPosicion = (int) $j['Posicion'];
            break;
        }
    }
    if ($miPosicion !== null) {
        $estadoRummy = rh_rummy_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
    }
}

json_success(['sala' => $salaSerializada, 'jugadasIA' => $jugadasIA, 'estadoRummy' => $estadoRummy]);
