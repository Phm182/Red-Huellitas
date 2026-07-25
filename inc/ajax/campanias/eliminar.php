<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_POST['campaniaId'] ?? 0);
if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}

$stmt = $conn->prepare('SELECT UserId FROM Campania WHERE CampaniaId = ?');
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania) {
    json_error('Campaña no encontrada', 404);
}
if ((int) $campania['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta campaña', 403);
}

$stmt = $conn->prepare("UPDATE Campania SET Estado = 'I' WHERE CampaniaId = ?");
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$stmt->close();

json_success(null, 'Campaña eliminada');
