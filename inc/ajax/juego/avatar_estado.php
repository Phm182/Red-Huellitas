<?php
/**
 * Qué puede hacer el usuario con el avatar IA de esta mascota. Es lo que el
 * frontend usa para decidir si muestra el botón, el contador o un mensaje.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/juego.php';
require_once __DIR__ . '/../../funciones/avatar_juego.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_GET['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);
if ($datos === null) {
    json_error('No tenés acceso a esta mascota', 403);
}

$configurado = rh_gemini_configurado();
$cuota = $configurado
    ? rh_avatar_cuota_disponible($conn, $userId)
    : ['puede' => false, 'restantesHoy' => 0, 'motivo' => null];

$tieneFoto = count(rh_mascota_fotos($conn, $mascotaId)) > 0;

// Un solo motivo, en orden de prioridad, para que el front muestre un mensaje
// claro en vez de tener que deducirlo.
$motivo = null;
if (!$configurado) {
    $motivo = 'no_configurado';
} elseif (!$tieneFoto) {
    $motivo = 'sin_foto';
} elseif (!$cuota['puede']) {
    $motivo = $cuota['motivo'] === 'global' ? 'limite_global' : 'limite_usuario';
}

json_success([
    'avatar' => [
        'disponible' => $configurado && $tieneFoto && $cuota['puede'],
        'restantesHoy' => $cuota['restantesHoy'],
        'tieneFotoOrigen' => $tieneFoto,
        'tieneAvatarGenerado' => $datos['juego']['AvatarPath'] !== null,
        'motivo' => $motivo,
    ],
]);
