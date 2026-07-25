<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$username = strtolower(trim($_POST['username'] ?? ''));
$zonaLat = $_POST['zonaLat'] ?? null;
$zonaLng = $_POST['zonaLng'] ?? null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
// Requerido solo si la cuenta todavía no la aceptó (p.ej. cuentas creadas vía Google,
// que no pasan por el formulario de registro tradicional donde se acepta la cláusula).
$aceptoClausula = filter_var($_POST['aceptaClausulaAntiCriaderos'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!rh_validar_username($username)) {
    json_error('Username inválido (3-30 caracteres, minúsculas/números/./_)');
}
if ($zonaLat === null || $zonaLng === null || !is_numeric($zonaLat) || !is_numeric($zonaLng)) {
    json_error('Ubicación (GPS) requerida');
}

$stmt = $conn->prepare('SELECT AceptoClausulaAntiCriaderos FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuarioActual = $stmt->get_result()->fetch_assoc();
$stmt->close();

$yaAceptoClausula = (bool) $usuarioActual['AceptoClausulaAntiCriaderos'];
if (!$yaAceptoClausula && !$aceptoClausula) {
    json_error('Debés aceptar la cláusula anti-criaderos para continuar');
}

$stmt = $conn->prepare('SELECT UserId FROM Usuario WHERE Username = ? AND UserId != ?');
$stmt->bind_param('si', $username, $userId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ese username ya está en uso', 409);
}
$stmt->close();

if ($yaAceptoClausula) {
    $stmt = $conn->prepare(
        "UPDATE Usuario
         SET Username = ?, ZonaLat = ?, ZonaLng = ?, ZonaDescripcion = ?, OnboardingCompleto = 'Y'
         WHERE UserId = ?"
    );
    $stmt->bind_param('sddsi', $username, $zonaLat, $zonaLng, $zonaDescripcion, $userId);
} else {
    $stmt = $conn->prepare(
        "UPDATE Usuario
         SET Username = ?, ZonaLat = ?, ZonaLng = ?, ZonaDescripcion = ?, OnboardingCompleto = 'Y',
             AceptoClausulaAntiCriaderos = 1, AceptoClausulaFecha = NOW()
         WHERE UserId = ?"
    );
    $stmt->bind_param('sddsi', $username, $zonaLat, $zonaLng, $zonaDescripcion, $userId);
}
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['user' => rh_usuario_publico($conn, $usuario)], 'Onboarding completado');
