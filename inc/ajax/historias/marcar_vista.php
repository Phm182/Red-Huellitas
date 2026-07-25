<?php
/**
 * Marca una historia puntual como vista por el usuario actual. Llamado por
 * el visor a medida que avanza, no todas de una.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$viewerUserId = rh_require_auth($conn);

$historiaId = (int) ($_POST['historiaId'] ?? 0);
if ($historiaId <= 0) {
    json_error('Falta historiaId');
}

$stmt = $conn->prepare("SELECT HistoriaId FROM Historia WHERE HistoriaId = ? AND Estado = 'A' AND ExpiraEn > NOW()");
$stmt->bind_param('i', $historiaId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Historia no encontrada', 404);
}
$stmt->close();

$stmt = $conn->prepare(
    'INSERT INTO HistoriaVista (HistoriaId, UserId) VALUES (?, ?) ON DUPLICATE KEY UPDATE HistoriaId = HistoriaId'
);
$stmt->bind_param('ii', $historiaId, $viewerUserId);
$stmt->execute();
$stmt->close();

json_success(null, 'Historia marcada como vista');
