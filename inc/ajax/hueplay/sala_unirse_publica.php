<?php
/**
 * Sumarse a una sala pública desde el visualizador (sin código).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta la sala');
}

$r = rh_sala_unirse_publica($conn, $userId, $salaId);
if (isset($r['error'])) {
    json_error($r['error']);
}

$jugadores = rh_sala_jugadores($conn, $salaId);
json_success(['sala' => rh_sala_serializar($conn, $r['sala'], $jugadores, $userId)]);
