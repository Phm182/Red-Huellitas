<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$transitoId = (int) ($_POST['transitoId'] ?? 0);
if ($transitoId <= 0) {
    json_error('Falta transitoId');
}

$stmt = $conn->prepare('SELECT UserId FROM Transito WHERE TransitoId = ?');
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$transito) {
    json_error('Publicación de tránsito no encontrada', 404);
}
if ((int) $transito['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta publicación', 403);
}

$stmt = $conn->prepare("UPDATE Transito SET Estado = 'I' WHERE TransitoId = ?");
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$stmt->close();

json_success(null, 'Publicación de tránsito eliminada');
