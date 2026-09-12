<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$activo = filter_var($_POST['activo'] ?? false, FILTER_VALIDATE_BOOLEAN);
$activoInt = $activo ? 1 : 0;

$stmt = $conn->prepare('UPDATE Usuario SET VerJugadaRivalEnVivo = ? WHERE UserId = ?');
$stmt->bind_param('ii', $activoInt, $userId);
$stmt->execute();
$stmt->close();

json_success(['verJugadaRivalEnVivo' => $activo], 'Preferencia actualizada');
