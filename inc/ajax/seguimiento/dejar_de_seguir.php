<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$userIdSeguido = (int) ($_POST['userIdSeguido'] ?? 0);
if ($userIdSeguido <= 0) {
    json_error('Falta userIdSeguido');
}

$stmt = $conn->prepare('DELETE FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
$stmt->bind_param('ii', $userId, $userIdSeguido);
$stmt->execute();
$stmt->close();

json_success(null, 'Dejaste de seguir a este usuario');
