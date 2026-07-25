<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$historiaId = (int) ($_POST['historiaId'] ?? 0);
if ($historiaId <= 0) {
    json_error('Falta historiaId');
}

$stmt = $conn->prepare('SELECT UserId FROM Historia WHERE HistoriaId = ?');
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$historia = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$historia) {
    json_error('Historia no encontrada', 404);
}
if ((int) $historia['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta historia', 403);
}

$stmt = $conn->prepare("UPDATE Historia SET Estado = 'I' WHERE HistoriaId = ?");
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$stmt->close();

json_success(null, 'Historia eliminada');
