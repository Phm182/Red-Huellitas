<?php
/**
 * Sumarse a una sala con el código compartible, sin invitación previa.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';

$userId = rh_require_auth($conn);

$codigo = strtoupper(trim($_POST['codigoInvitacion'] ?? ''));
if ($codigo === '') {
    json_error('Falta el código');
}

$resultado = rh_sala_unirse_codigo($conn, $userId, $codigo);
if (isset($resultado['error'])) {
    json_error($resultado['error'], 409);
}

$sala = $resultado['sala'];
$jugadores = rh_sala_jugadores($conn, (int) $sala['SalaId']);
json_success(['sala' => rh_sala_serializar($conn, $sala, $jugadores, $userId)]);
