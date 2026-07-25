<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$activo = filter_var($_POST['activo'] ?? true, FILTER_VALIDATE_BOOLEAN);
$activoInt = $activo ? 1 : 0;

$stmt = $conn->prepare('UPDATE Usuario SET NotificarProximidad = ? WHERE UserId = ?');
$stmt->bind_param('ii', $activoInt, $userId);
$stmt->execute();
$stmt->close();

json_success(['notificarProximidad' => $activo], 'Preferencia actualizada');
