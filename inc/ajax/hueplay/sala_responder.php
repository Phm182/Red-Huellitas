<?php
/**
 * Aceptar o rechazar una invitación puntual a una sala.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
$aceptar = !empty($_POST['aceptar']);

if ($salaId <= 0) {
    json_error('Falta salaId');
}

$sala = rh_sala_obtener($conn, $salaId);
if (!$sala) {
    json_error('La sala no existe', 404);
}

$ok = rh_sala_responder($conn, $userId, $salaId, $aceptar);
if (!$ok) {
    json_error('No tenés una invitación pendiente a esta sala', 409);
}

$sala = rh_sala_obtener($conn, $salaId);
$jugadores = rh_sala_jugadores($conn, $salaId);
json_success(['sala' => rh_sala_serializar($conn, $sala, $jugadores, $userId)]);
