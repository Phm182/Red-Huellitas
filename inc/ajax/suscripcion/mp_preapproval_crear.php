<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

$userId = rh_require_auth($conn);

if (!rh_mp_configurado()) {
    json_error('Mercado Pago no está configurado todavía', 503);
}

$planId = isset($_POST['planId']) && $_POST['planId'] !== '' ? (int) $_POST['planId'] : null;
if ($planId === null) {
    $stmt = $conn->prepare("SELECT PlanId FROM SuscripcionPlan WHERE Estado = 'A' ORDER BY PlanId ASC LIMIT 1");
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        json_error('No hay ningún plan de suscripción disponible', 404);
    }
    $planId = (int) $row['PlanId'];
}

$stmt = $conn->prepare("SELECT * FROM SuscripcionPlan WHERE PlanId = ? AND Estado = 'A'");
$stmt->bind_param('i', $planId);
$stmt->execute();
$plan = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$plan) {
    json_error('Plan de suscripción no encontrado', 404);
}

$stmt = $conn->prepare('SELECT Email FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

$config = rh_mp_config();
$backUrl = $config['MP_BACK_URL'] ?? '';

$externalReference = "rh:suscripcion:$userId:$planId";

try {
    $resultado = rh_mp_api_request('POST', '/preapproval', [
        'reason' => $plan['Nombre'],
        'external_reference' => $externalReference,
        'payer_email' => $usuario['Email'],
        'back_url' => $backUrl,
        'auto_recurring' => [
            'frequency' => 1,
            'frequency_type' => 'months',
            'transaction_amount' => (float) $plan['MontoMensual'],
            'currency_id' => 'ARS',
        ],
        'status' => 'pending',
    ]);
} catch (RuntimeException $e) {
    json_error('Error al comunicarse con Mercado Pago: ' . $e->getMessage(), 502);
}

if ($resultado['httpCode'] >= 400) {
    json_error('Mercado Pago rechazó la solicitud', 502, $resultado['data']);
}

$mpId = $resultado['data']['id'] ?? null;
$mpEstado = $resultado['data']['status'] ?? null;
$metodoMp = 'mercadopago';

$stmt = $conn->prepare(
    'UPDATE Usuario SET SuscripcionMpId = ?, SuscripcionMpEstado = ?, SuscripcionMetodoActivo = ? WHERE UserId = ?'
);
$stmt->bind_param('sssi', $mpId, $mpEstado, $metodoMp, $userId);
$stmt->execute();
$stmt->close();

json_success([
    'initPoint' => $resultado['data']['init_point'] ?? $resultado['data']['sandbox_init_point'] ?? null,
    'mpEstado' => $mpEstado,
]);
