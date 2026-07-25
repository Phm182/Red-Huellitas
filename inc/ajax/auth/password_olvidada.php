<?php
/**
 * Solicita un código de recuperación de contraseña (6 dígitos, 1 hora).
 * Respuesta siempre genérica para no filtrar si el email existe.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/email.php';

$email = trim($_POST['email'] ?? '');
$msgOk = 'Si el email está registrado, te enviamos un código para restablecer la contraseña.';

if (!rh_validar_email($email)) {
    // Misma respuesta genérica.
    json_success(['emailEnviado' => false], $msgOk);
}

$stmt = $conn->prepare(
    "SELECT UserId, Email, NombreCompleto, PasswordHash
     FROM Usuario
     WHERE Email = ? AND Estado = 'A'
     LIMIT 1"
);
$stmt->bind_param('s', $email);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario || empty($usuario['PasswordHash'])) {
    // Google-only o inexistente: no revelar.
    json_success(['emailEnviado' => false], $msgOk);
}

$userId = (int) $usuario['UserId'];
$codigo = (string) random_int(100000, 999999);
$hash = password_hash($codigo, PASSWORD_DEFAULT);
$expira = (new DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');

// Invalidar códigos previos no usados.
$stmt = $conn->prepare(
    'UPDATE PasswordReset SET UsadoEn = NOW()
     WHERE UserId = ? AND UsadoEn IS NULL'
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare(
    'INSERT INTO PasswordReset (UserId, CodigoHash, ExpiraEn) VALUES (?, ?, ?)'
);
$stmt->bind_param('iss', $userId, $hash, $expira);
$stmt->execute();
$stmt->close();

$nombre = trim((string) $usuario['NombreCompleto']) ?: 'hola';
$cuerpo = "Hola {$nombre},\n\n"
    . "Tu código para restablecer la contraseña en Red Huellitas es: {$codigo}\n\n"
    . "Vence en 1 hora. Si no pediste esto, ignorá este mensaje.\n\n"
    . "— Equipo Red Huellitas\n";

$enviado = rh_email_enviar($email, 'Código para restablecer tu contraseña', $cuerpo);

if (!$enviado) {
    error_log('password_olvidada: no se pudo enviar email a ' . $email . ' (¿SMTP configurado?)');
}

json_success([
    'emailEnviado' => (bool) $enviado,
    // Solo en entornos sin SMTP: facilita QA local. Nunca en producción real.
    'debugCodigo' => (!$enviado && getenv('RH_DEBUG_RESET') === '1') ? $codigo : null,
], $msgOk);
