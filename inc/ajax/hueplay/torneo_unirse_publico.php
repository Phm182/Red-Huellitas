<?php
/** Sumarse a un torneo PÚBLICO desde el visualizador (por id, sin código). */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$torneoId = (int) ($_POST['torneoId'] ?? 0);
if ($torneoId <= 0) {
    json_error('Falta el torneo');
}

$t = rh_torneo_obtener($conn, $torneoId);
if (!$t || !$t['EsPublico']) {
    json_error('Ese torneo no es público', 403);
}

$res = rh_torneo_unirse($conn, $userId, $torneoId);
if (isset($res['error'])) {
    json_error($res['error'], 409);
}

json_success(['torneo' => rh_torneo_serializar($conn, $res['torneo'], $userId)]);
