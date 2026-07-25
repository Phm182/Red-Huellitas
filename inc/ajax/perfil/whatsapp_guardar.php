<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$numero = trim($_POST['whatsappNumero'] ?? '');
$visibilidad = $_POST['visibilidad'] ?? null;

if (!rh_validar_whatsapp($numero)) {
    json_error('Número de WhatsApp inválido');
}
if ($visibilidad !== null && !in_array($visibilidad, ['publica', 'privada'], true)) {
    json_error("visibilidad debe ser 'publica' o 'privada'");
}

if ($visibilidad !== null) {
    $stmt = $conn->prepare('UPDATE Usuario SET WhatsappNumero = ?, WhatsappVisibilidad = ? WHERE UserId = ?');
    $stmt->bind_param('ssi', $numero, $visibilidad, $userId);
} else {
    $stmt = $conn->prepare('UPDATE Usuario SET WhatsappNumero = ? WHERE UserId = ?');
    $stmt->bind_param('si', $numero, $userId);
}
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT WhatsappNumero, WhatsappVisibilidad FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$actual = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'whatsappNumero' => $actual['WhatsappNumero'],
    'whatsappVisibilidad' => $actual['WhatsappVisibilidad'],
], 'WhatsApp actualizado');
