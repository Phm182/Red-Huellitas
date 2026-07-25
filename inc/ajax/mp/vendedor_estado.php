<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare('SELECT MpEmail FROM UsuarioMpCuenta WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$cuenta = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($cuenta) {
    json_success(['conectado' => true, 'mpEmail' => $cuenta['MpEmail']]);
}

json_success(['conectado' => false, 'mpEmail' => null]);
