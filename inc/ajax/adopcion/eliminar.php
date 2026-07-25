<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$adopcionId = (int) ($_POST['adopcionId'] ?? 0);
if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}

$stmt = $conn->prepare('SELECT UserId FROM Adopcion WHERE AdopcionId = ?');
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$adopcion) {
    json_error('Publicación de adopción no encontrada', 404);
}
if ((int) $adopcion['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta publicación', 403);
}

$stmt = $conn->prepare("UPDATE Adopcion SET Estado = 'I' WHERE AdopcionId = ?");
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$stmt->close();

json_success(null, 'Publicación de adopción eliminada');
