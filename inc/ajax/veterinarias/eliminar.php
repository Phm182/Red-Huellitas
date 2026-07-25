<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$veterinariaId = (int) ($_POST['veterinariaId'] ?? 0);
if ($veterinariaId <= 0) {
    json_error('Falta veterinariaId');
}

$stmt = $conn->prepare('SELECT UserId FROM Veterinaria WHERE VeterinariaId = ?');
$stmt->bind_param('i', $veterinariaId);
$stmt->execute();
$veterinaria = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$veterinaria) {
    json_error('Veterinaria no encontrada', 404);
}
if ((int) $veterinaria['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta veterinaria', 403);
}

$stmt = $conn->prepare("UPDATE Veterinaria SET Estado = 'I' WHERE VeterinariaId = ?");
$stmt->bind_param('i', $veterinariaId);
$stmt->execute();
$stmt->close();

json_success(null, 'Veterinaria eliminada');
