<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
$disponible = filter_var($_POST['disponible'] ?? false, FILTER_VALIDATE_BOOLEAN);

if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$stmt = $conn->prepare('SELECT UserId FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$mascota) {
    json_error('Mascota no encontrada', 404);
}
if ((int) $mascota['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta mascota', 403);
}

$disponibleInt = $disponible ? 1 : 0;
$stmt = $conn->prepare('UPDATE Mascota SET DisponibleParaMatch = ? WHERE MascotaId = ?');
$stmt->bind_param('ii', $disponibleInt, $mascotaId);
$stmt->execute();
$stmt->close();

json_success(['disponibleParaMatch' => $disponible], 'Actualizado');
