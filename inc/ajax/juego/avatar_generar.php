<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/juego.php';
require_once __DIR__ . '/../../funciones/avatar_juego.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);
if ($datos === null) {
    json_error('No tenés acceso a esta mascota', 403);
}

$resultado = rh_avatar_generar($conn, $datos['juego'], $datos['mascota'], $userId);

if (!$resultado['ok']) {
    json_error($resultado['error'], $resultado['codigo']);
}

// Se relee para devolver el estado del juego ya con el avatar nuevo.
$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);

json_success(
    ['juego' => rh_juego_publico($conn, $datos['juego'], $datos['mascota'])],
    '¡Listo! Así quedó el avatar de tu mascota'
);
