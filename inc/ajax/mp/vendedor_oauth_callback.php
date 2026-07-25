<?php
/**
 * Callback del flujo OAuth de vinculación de cuenta de Mercado Pago del
 * vendedor. Endpoint público (lo redirige el navegador desde Mercado Pago,
 * no es un fetch de la app) — responde HTML mínimo, no JSON.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

function rh_mp_callback_page(string $mensaje, bool $ok): void
{
    header('Content-Type: text/html; charset=utf-8');
    $color = $ok ? '#2e7d32' : '#c62828';
    $mensajeEscapado = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');
    echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Mercado Pago</title></head>"
        . "<body style='font-family:sans-serif;text-align:center;padding:40px;'>"
        . "<h2 style='color:$color;'>$mensajeEscapado</h2>"
        . "<p>Podés cerrar esta ventana y volver a la app.</p>"
        . '</body></html>';
    exit;
}

$code = $_GET['code'] ?? null;
$state = $_GET['state'] ?? null;

if (!$code || !$state) {
    rh_mp_callback_page('Faltan datos de la autorización', false);
}

$stmt = $conn->prepare('SELECT UserId FROM UsuarioMpOauthPendiente WHERE State = ?');
$stmt->bind_param('s', $state);
$stmt->execute();
$pendiente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$pendiente) {
    rh_mp_callback_page('El enlace de conexión expiró o ya se usó', false);
}

$userId = (int) $pendiente['UserId'];

$stmt = $conn->prepare('DELETE FROM UsuarioMpOauthPendiente WHERE State = ?');
$stmt->bind_param('s', $state);
$stmt->execute();
$stmt->close();

try {
    $resultado = rh_mp_oauth_exchange_code($code);
} catch (RuntimeException $e) {
    rh_mp_callback_page('Error al conectar con Mercado Pago', false);
}

if ($resultado['httpCode'] >= 400 || empty($resultado['data']['access_token'])) {
    rh_mp_callback_page('Mercado Pago rechazó la autorización', false);
}

$accessToken = $resultado['data']['access_token'];
$refreshToken = $resultado['data']['refresh_token'] ?? null;
$mpUserId = (string) ($resultado['data']['user_id'] ?? '');
$expiresIn = (int) ($resultado['data']['expires_in'] ?? 0);
$expiresAt = $expiresIn > 0 ? date('Y-m-d H:i:s', time() + $expiresIn) : null;

$mpEmail = null;
try {
    $perfil = rh_mp_api_request('GET', '/users/me', null, $accessToken);
    $mpEmail = $perfil['data']['email'] ?? null;
} catch (RuntimeException $e) {
    // best-effort, no bloquea la vinculación si falla
}

$stmt = $conn->prepare(
    'INSERT INTO UsuarioMpCuenta (UserId, MpUserId, MpEmail, AccessToken, RefreshToken, ExpiresAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE MpUserId = VALUES(MpUserId), MpEmail = VALUES(MpEmail),
        AccessToken = VALUES(AccessToken), RefreshToken = VALUES(RefreshToken), ExpiresAt = VALUES(ExpiresAt)'
);
$stmt->bind_param('isssss', $userId, $mpUserId, $mpEmail, $accessToken, $refreshToken, $expiresAt);
$stmt->execute();
$stmt->close();

rh_mp_callback_page('Cuenta de Mercado Pago conectada', true);
