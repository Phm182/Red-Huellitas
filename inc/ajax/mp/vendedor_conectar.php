<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

$userId = rh_require_auth($conn);

if (!rh_mp_marketplace_configurado()) {
    json_error('La vinculación con Mercado Pago no está configurada todavía', 503);
}

$state = bin2hex(random_bytes(16));

$stmt = $conn->prepare('INSERT INTO UsuarioMpOauthPendiente (State, UserId) VALUES (?, ?)');
$stmt->bind_param('si', $state, $userId);
$stmt->execute();
$stmt->close();

json_success(['authorizeUrl' => rh_mp_oauth_authorize_url($state)]);
