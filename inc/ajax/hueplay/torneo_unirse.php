<?php
/** Sumarse a un torneo con el código compartible. */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$codigo = strtoupper(trim($_POST['codigoInvitacion'] ?? ''));
if ($codigo === '') {
    json_error('Falta el código');
}

$stmt = $conn->prepare('SELECT TorneoId FROM Torneo WHERE CodigoInvitacion = ?');
$stmt->bind_param('s', $codigo);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$row) {
    json_error('Código inválido', 404);
}

$res = rh_torneo_unirse($conn, $userId, (int) $row['TorneoId']);
if (isset($res['error'])) {
    json_error($res['error'], 409);
}

json_success(['torneo' => rh_torneo_serializar($conn, $res['torneo'], $userId)]);
