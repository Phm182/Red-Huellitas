<?php
/**
 * Restablece la contraseña con email + código de 6 dígitos + nueva password.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';

$email = trim($_POST['email'] ?? '');
$codigo = trim($_POST['codigo'] ?? '');
$password = (string) ($_POST['password'] ?? '');

if (!rh_validar_email($email) || !preg_match('/^\d{6}$/', $codigo)) {
    json_error('Código o email inválidos', 400);
}
if (!rh_validar_password($password)) {
    json_error('La contraseña debe tener al menos 8 caracteres', 400);
}

$stmt = $conn->prepare(
    "SELECT UserId FROM Usuario WHERE Email = ? AND Estado = 'A' LIMIT 1"
);
$stmt->bind_param('s', $email);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario) {
    json_error('Código o email inválidos', 400);
}
$userId = (int) $usuario['UserId'];

$stmt = $conn->prepare(
    'SELECT PasswordResetId, CodigoHash, ExpiraEn
     FROM PasswordReset
     WHERE UserId = ? AND UsadoEn IS NULL
     ORDER BY PasswordResetId DESC
     LIMIT 5'
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$resets = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$matchId = null;
$now = new DateTimeImmutable('now');
foreach ($resets as $row) {
    $expira = new DateTimeImmutable($row['ExpiraEn']);
    if ($expira < $now) {
        continue;
    }
    if (password_verify($codigo, $row['CodigoHash'])) {
        $matchId = (int) $row['PasswordResetId'];
        break;
    }
}

if ($matchId === null) {
    json_error('Código inválido o vencido', 400);
}

$hash = rh_hash_password($password);
$stmt = $conn->prepare('UPDATE Usuario SET PasswordHash = ?, UpdatedAt = NOW() WHERE UserId = ?');
$stmt->bind_param('si', $hash, $userId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('UPDATE PasswordReset SET UsadoEn = NOW() WHERE PasswordResetId = ?');
$stmt->bind_param('i', $matchId);
$stmt->execute();
$stmt->close();

// Revocar sesiones activas por seguridad.
$stmt = $conn->prepare(
    'UPDATE UsuarioSesion SET RevocadoEn = NOW()
     WHERE UserId = ? AND RevocadoEn IS NULL'
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Contraseña actualizada. Ya podés iniciar sesión.');
