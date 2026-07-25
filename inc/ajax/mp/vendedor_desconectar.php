<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare('DELETE FROM UsuarioMpCuenta WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Cuenta de Mercado Pago desvinculada');
