<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/google_auth.php';

$idToken = trim($_POST['idToken'] ?? '');
if ($idToken === '') {
    json_error('Falta idToken');
}

$payload = rh_verificar_google_id_token($idToken);
if (!$payload) {
    json_error('Token de Google inválido o expirado', 401);
}

$googleSub = $payload['sub'] ?? null;
$email = $payload['email'] ?? null;
$emailVerificado = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
$nombre = $payload['name'] ?? ($email ? explode('@', $email)[0] : 'Usuario');

if (!$googleSub || !$email) {
    json_error('El token de Google no incluye la información necesaria', 400);
}

// 1) Buscar cuenta ya vinculada por GoogleSub
$stmt = $conn->prepare('SELECT * FROM Usuario WHERE GoogleSub = ?');
$stmt->bind_param('s', $googleSub);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario && $emailVerificado) {
    // 2) Vincular a una cuenta existente con el mismo email (Google ya verificó el email)
    $stmt = $conn->prepare('SELECT * FROM Usuario WHERE Email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $existente = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($existente) {
        $stmt = $conn->prepare('UPDATE Usuario SET GoogleSub = ? WHERE UserId = ?');
        $stmt->bind_param('si', $googleSub, $existente['UserId']);
        $stmt->execute();
        $stmt->close();
        $usuario = $existente;
        $usuario['GoogleSub'] = $googleSub;
    }
}

if (!$usuario) {
    // 3) Crear cuenta nueva (tipo por defecto: individual)
    $stmt = $conn->prepare('SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = ?');
    $tipoDefault = 'individual';
    $stmt->bind_param('s', $tipoDefault);
    $stmt->execute();
    $tipo = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $tipoUsuarioId = (int) ($tipo['TipoUsuarioId'] ?? 0);

    $stmt = $conn->prepare(
        'INSERT INTO Usuario (Email, GoogleSub, NombreCompleto, TipoUsuarioId) VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('sssi', $email, $googleSub, $nombre, $tipoUsuarioId);
    $stmt->execute();
    $userId = (int) $stmt->insert_id;
    $stmt->close();

    $stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $usuario = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

if ($usuario['Estado'] !== 'A') {
    json_error('Cuenta suspendida', 403);
}

$token = rh_crear_sesion($conn, (int) $usuario['UserId']);

json_success([
    'token' => $token,
    'user' => rh_usuario_publico($conn, $usuario),
], 'Login con Google exitoso');
