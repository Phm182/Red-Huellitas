<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';

$email = trim($_POST['email'] ?? '');
$password = (string) ($_POST['password'] ?? '');

if (!rh_validar_email($email) || $password === '') {
    json_error('Email o contraseña inválidos', 401);
}

$stmt = $conn->prepare('SELECT * FROM Usuario WHERE Email = ? AND Estado = \'A\'');
$stmt->bind_param('s', $email);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario || !rh_verify_password($password, $usuario['PasswordHash'])) {
    json_error('Email o contraseña inválidos', 401);
}

$token = rh_crear_sesion($conn, (int) $usuario['UserId']);

json_success([
    'token' => $token,
    'user' => rh_usuario_publico($conn, $usuario),
], 'Login exitoso');
