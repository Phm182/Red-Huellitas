<?php
/**
 * Objetivos de HuePlay: los diarios de hoy y los logros con sus escalones,
 * con el progreso del usuario. Al abrirlos se cobra lo que ya esté cumplido.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

if (!rh_obj_disponible($conn)) {
    json_success(['disponible' => false, 'diarios' => [], 'logros' => [], 'progreso' => rh_juego_progreso(0)]);
}

rh_juego_perfil($conn, $userId);
$eval = rh_obj_evaluar($conn, $userId);
$perfil = rh_juego_perfil($conn, $userId);
$lista = rh_obj_listar($conn, $userId);

json_success([
    'disponible' => true,
    'progreso' => rh_cuenta_progreso((int) ($perfil['Xp'] ?? 0)),
    'diarios' => $lista['diarios'],
    'logros' => $lista['logros'],
    'nuevos' => $eval['nuevos'],
]);
