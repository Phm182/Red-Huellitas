<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

$userId = rh_require_auth($conn);

if (!rh_mp_marketplace_configurado()) {
    json_error(
        'Para “Conectar cuenta” falta el Client Secret de la misma aplicación de Mercado Pago '
        . 'que ya usás (Access Token). Entrá a developers.mercadopago.com → tu app → '
        . 'Credenciales (prueba o las de esa app) y copiá Client Secret en '
        . 'mercadopago.local.php → MP_CLIENT_SECRET. El Client ID se toma solo del token si está vacío.',
        503
    );
}

$themeRaw = strtolower(trim((string) ($_POST['theme'] ?? $_GET['theme'] ?? 'light')));
$theme = $themeRaw === 'dark' ? 'dark' : 'light';

$forceRaw = strtolower(trim((string) ($_POST['forceLogin'] ?? $_GET['forceLogin'] ?? '')));
$forzarSelector = in_array($forceRaw, ['1', 'true', 'yes', 'si'], true);

$state = bin2hex(random_bytes(16));

$stmt = $conn->prepare('INSERT INTO UsuarioMpOauthPendiente (State, UserId, Theme) VALUES (?, ?, ?)');
if ($stmt === false) {
    $stmt = $conn->prepare('INSERT INTO UsuarioMpOauthPendiente (State, UserId) VALUES (?, ?)');
    $stmt->bind_param('si', $state, $userId);
} else {
    $stmt->bind_param('sis', $state, $userId, $theme);
}
$stmt->execute();
$stmt->close();

json_success(['authorizeUrl' => rh_mp_oauth_authorize_url($state, $forzarSelector)]);
