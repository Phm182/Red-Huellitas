<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

$userId = rh_require_admin($conn);

$solicitudId = (int) ($_POST['solicitudId'] ?? 0);
if ($solicitudId <= 0) {
    json_error('Falta solicitudId');
}

$stmt = $conn->prepare('SELECT * FROM SuscripcionSolicitudManual WHERE SolicitudId = ?');
$stmt->bind_param('i', $solicitudId);
$stmt->execute();
$solicitud = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$solicitud || $solicitud['Estado'] !== 'pendiente') {
    json_error('Solicitud no encontrada o ya resuelta', 404);
}

$solicitudPlanId = (int) $solicitud['PlanId'];
$stmt = $conn->prepare('SELECT MontoMensual FROM SuscripcionPlan WHERE PlanId = ?');
$stmt->bind_param('i', $solicitudPlanId);
$stmt->execute();
$plan = $stmt->get_result()->fetch_assoc();
$stmt->close();

rh_suscripcion_aplicar_pago(
    $conn,
    (int) $solicitud['UserId'],
    (int) $solicitud['PlanId'],
    'manual',
    (float) $plan['MontoMensual'],
    null,
    1
);

$stmt = $conn->prepare(
    "UPDATE SuscripcionSolicitudManual SET Estado = 'aprobada', ResueltoPorUserId = ?, ResueltoEn = NOW() WHERE SolicitudId = ?"
);
$stmt->bind_param('ii', $userId, $solicitudId);
$stmt->execute();
$stmt->close();

json_success(null, 'Pago confirmado');
