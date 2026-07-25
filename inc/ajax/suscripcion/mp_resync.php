<?php
/**
 * El front llama esto al volver del checkout hospedado por Mercado Pago,
 * porque los webhooks de MP no pueden llegar a localhost — mismo rol que
 * mp_billing_resync.php en Contapp.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

$userId = rh_require_auth($conn);

if (!rh_mp_configurado()) {
    json_error('Mercado Pago no está configurado todavía', 503);
}

$stmt = $conn->prepare('SELECT SuscripcionMpId FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario || $usuario['SuscripcionMpId'] === null) {
    json_error('No hay ninguna suscripción de Mercado Pago para actualizar', 404);
}

try {
    rh_mp_procesar_preapproval($conn, $usuario['SuscripcionMpId']);
} catch (RuntimeException $e) {
    json_error('Error al comunicarse con Mercado Pago: ' . $e->getMessage(), 502);
}

$stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuarioActualizado = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['suscripcion' => rh_suscripcion_publica($conn, $usuarioActualizado)]);
