<?php
/**
 * Devuelve el perfil del usuario autenticado. Necesario para restaurar la
 * sesión al reabrir la app (el token persiste en SecureStore, pero el
 * objeto Usuario completo no se guarda en el dispositivo).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario) {
    json_error('Usuario no encontrado', 404);
}

json_success(['user' => rh_usuario_publico($conn, $usuario)]);
