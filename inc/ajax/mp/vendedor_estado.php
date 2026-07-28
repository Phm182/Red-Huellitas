<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    'SELECT MpEmail, MpNombre, MpTelefono, AccessToken FROM UsuarioMpCuenta WHERE UserId = ?'
);
if ($stmt === false) {
    $stmt = $conn->prepare('SELECT MpEmail FROM UsuarioMpCuenta WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $cuenta = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    json_success([
        'conectado' => (bool) $cuenta,
        'mpEmail' => $cuenta['MpEmail'] ?? null,
        'mpNombre' => null,
        'mpTelefono' => null,
        'marketplaceListo' => rh_mp_marketplace_configurado(),
    ]);
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$cuenta = $stmt->get_result()->fetch_assoc();
$stmt->close();

$mpEmail = $cuenta['MpEmail'] ?? null;
$mpNombre = $cuenta['MpNombre'] ?? null;
$mpTelefono = $cuenta['MpTelefono'] ?? null;

// Si faltan nombre/teléfono, reconsultar Mercado Pago y persistir.
if ($cuenta && (!empty($cuenta['AccessToken'])) && ($mpNombre === null || $mpNombre === '' || $mpTelefono === null || $mpTelefono === '')) {
    try {
        $me = rh_mp_api_request('GET', '/users/me', null, $cuenta['AccessToken']);
        if (!empty($me['data']) && is_array($me['data']) && ($me['httpCode'] ?? 500) < 400) {
            $perfil = rh_mp_perfil_desde_api($me['data']);
            $mpNombre = $perfil['nombre'] ?? $mpNombre;
            $mpEmail = $perfil['email'] ?? $mpEmail;
            $mpTelefono = $perfil['telefono'] ?? $mpTelefono;

            $upd = $conn->prepare(
                'UPDATE UsuarioMpCuenta SET MpEmail = ?, MpNombre = ?, MpTelefono = ? WHERE UserId = ?'
            );
            if ($upd !== false) {
                $upd->bind_param('sssi', $mpEmail, $mpNombre, $mpTelefono, $userId);
                $upd->execute();
                $upd->close();
            }
        }
    } catch (RuntimeException $e) {
        // best-effort
    }
}

json_success([
    'conectado' => (bool) $cuenta,
    'mpEmail' => $mpEmail,
    'mpNombre' => $mpNombre,
    'mpTelefono' => $mpTelefono,
    'marketplaceListo' => rh_mp_marketplace_configurado(),
]);
