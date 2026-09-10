<?php
/** Arranca el torneo: sólo el creador, con 2+ inscriptos. */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$torneoId = (int) ($_POST['torneoId'] ?? 0);
if ($torneoId <= 0) {
    json_error('Falta torneoId');
}

$res = rh_torneo_iniciar($conn, $torneoId, $userId);
if (isset($res['error'])) {
    json_error($res['error'], 409);
}

json_success(['torneo' => rh_torneo_serializar($conn, $res['torneo'], $userId)]);
