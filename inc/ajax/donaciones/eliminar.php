<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$donacionId = (int) ($_POST['donacionId'] ?? 0);
if ($donacionId <= 0) {
    json_error('Falta donacionId');
}

$stmt = $conn->prepare('SELECT UserId FROM Donacion WHERE DonacionId = ?');
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$donacion) {
    json_error('Publicación de donación no encontrada', 404);
}
if ((int) $donacion['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta publicación', 403);
}

$stmt = $conn->prepare("UPDATE Donacion SET Estado = 'I' WHERE DonacionId = ?");
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$stmt->close();

json_success(null, 'Publicación de donación eliminada');
