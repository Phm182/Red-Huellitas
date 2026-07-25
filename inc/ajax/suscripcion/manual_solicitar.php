<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';

$userId = rh_require_auth($conn);

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

$stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

$metodoManual = 'manual';
$stmt = $conn->prepare('UPDATE Usuario SET SuscripcionMetodoActivo = ? WHERE UserId = ?');
$stmt->bind_param('si', $metodoManual, $userId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('INSERT INTO SuscripcionSolicitudManual (UserId, PlanId) VALUES (?, ?)');
$stmt->bind_param('ii', $userId, $planId);
$stmt->execute();
$solicitudId = (int) $stmt->insert_id;
$stmt->close();

$config = rh_mp_config();
$soporteWhatsapp = $config['SOPORTE_WHATSAPP'] ?? '';
$nombre = $usuario['NombreCompleto'] ?? $usuario['Username'] ?? "usuario #$userId";
$texto = "Hola! Quiero pagar la suscripción \"{$plan['Nombre']}\" ($" . number_format((float) $plan['MontoMensual'], 2) . ") — soy $nombre.";
$whatsappUrl = $soporteWhatsapp !== ''
    ? 'https://wa.me/' . preg_replace('/\D/', '', $soporteWhatsapp) . '?text=' . rawurlencode($texto)
    : null;

json_success([
    'solicitudId' => $solicitudId,
    'whatsappUrl' => $whatsappUrl,
], 'Solicitud enviada', 201);
