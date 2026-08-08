<?php
/**
 * Estado actual de una sala. Antes de mostrarla, la deja al día: resuelve el
 * turno vencido si lo hay y encadena los turnos de IA que correspondan —
 * mismo criterio perezoso que `desafio_ver.php`.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/ludo.php';
require_once __DIR__ . '/../../funciones/rummy.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_GET['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta salaId');
}

$sala = rh_sala_obtener($conn, $salaId);
if (!$sala) {
    json_error('La sala no existe', 404);
}

$jugadores = rh_sala_jugadores($conn, $salaId);
$esParticipante = false;
foreach ($jugadores as $j) {
    if ((int) $j['UserId'] === $userId) {
        $esParticipante = true;
        break;
    }
}
if (!$esParticipante) {
    json_error('Esta sala no es tuya', 403);
}

$jugadasIA = [];
$estadoRummy = null;

if ($sala['JuegoCodigo'] === 'hueludo') {
    $resultado = rh_ludo_sala_actualizar($conn, $sala);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
} elseif ($sala['JuegoCodigo'] === 'huerummy') {
    $resultado = rh_rummy_sala_actualizar($conn, $sala);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);

if ($sala['JuegoCodigo'] === 'hueludo' && $sala['Tablero'] !== null) {
    // Ludo no tiene información oculta: el tablero completo es seguro para
    // cualquiera de los jugadores.
    $salaSerializada['tablero'] = $sala['Tablero'];
} elseif ($sala['JuegoCodigo'] === 'huerummy' && $sala['Tablero'] !== null && $salaSerializada['miAsientoId'] !== null) {
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
