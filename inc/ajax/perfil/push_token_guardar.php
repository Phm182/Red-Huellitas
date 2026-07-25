<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$token = trim($_POST['expoPushToken'] ?? '');
if ($token === '' || mb_strlen($token) > 255) {
    json_error('Token inválido');
}

$stmt = $conn->prepare('UPDATE Usuario SET ExpoPushToken = ? WHERE UserId = ?');
$stmt->bind_param('si', $token, $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Token guardado');
