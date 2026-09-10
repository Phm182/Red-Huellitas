<?php
/** Estado actual de un torneo (llave/tabla + mi partida activa). */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$torneoId = (int) ($_GET['torneoId'] ?? 0);
if ($torneoId <= 0) {
    json_error('Falta torneoId');
}

$t = rh_torneo_obtener($conn, $torneoId);
if (!$t) {
    json_error('El torneo no existe', 404);
}

json_success(['torneo' => rh_torneo_serializar($conn, $t, $userId)]);
