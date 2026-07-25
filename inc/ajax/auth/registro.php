<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';

$email = trim($_POST['email'] ?? '');
$password = (string) ($_POST['password'] ?? '');
$nombreCompleto = trim($_POST['nombreCompleto'] ?? '');
$aceptoClausula = filter_var($_POST['aceptaClausulaAntiCriaderos'] ?? false, FILTER_VALIDATE_BOOLEAN);
$tipoUsuarioCodigo = trim($_POST['tipoUsuarioCodigo'] ?? '') ?: 'individual';

if (!rh_validar_email($email)) {
    json_error('Email inválido');
}
if (!rh_validar_password($password)) {
    json_error('La contraseña debe tener al menos 8 caracteres');
}
if ($nombreCompleto === '') {
    json_error('El nombre completo es obligatorio');
}
if (!$aceptoClausula) {
    json_error('Debés aceptar la cláusula anti-criaderos para registrarte');
}

$stmt = $conn->prepare('SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = ?');
$stmt->bind_param('s', $tipoUsuarioCodigo);
$stmt->execute();
$tipo = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$tipo) {
    json_error('Tipo de usuario desconocido');
}
$tipoUsuarioId = (int) $tipo['TipoUsuarioId'];

$stmt = $conn->prepare('SELECT UserId FROM Usuario WHERE Email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya existe una cuenta con ese email', 409);
}
$stmt->close();

$hash = rh_hash_password($password);

$stmt = $conn->prepare(
    'INSERT INTO Usuario (Email, PasswordHash, NombreCompleto, TipoUsuarioId, AceptoClausulaAntiCriaderos, AceptoClausulaFecha)
     VALUES (?, ?, ?, ?, 1, NOW())'
);
$stmt->bind_param('sssi', $email, $hash, $nombreCompleto, $tipoUsuarioId);
$stmt->execute();
$userId = (int) $stmt->insert_id;
$stmt->close();

$token = rh_crear_sesion($conn, $userId);

$stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'token' => $token,
    'user' => rh_usuario_publico($conn, $usuario),
], 'Registro exitoso', 201);
