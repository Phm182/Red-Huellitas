<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$perdidoId = (int) ($_POST['perdidoId'] ?? 0);
if ($perdidoId <= 0) {
    json_error('Falta perdidoId');
}

$stmt = $conn->prepare('SELECT UserId FROM Perdido WHERE PerdidoId = ?');
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$perdido = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$perdido) {
    json_error('Reporte no encontrado', 404);
}
if ((int) $perdido['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar este reporte', 403);
}

$stmt = $conn->prepare("UPDATE Perdido SET Estado = 'I' WHERE PerdidoId = ?");
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$stmt->close();

json_success(null, 'Reporte eliminado');
