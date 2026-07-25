<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
$targetUserId = (int) ($_POST['userId'] ?? 0);

if ($mascotaId <= 0 || $targetUserId <= 0) {
    json_error('Faltan mascotaId o userId');
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
    json_error('No tenés permiso sobre esta mascota', 403);
}

$stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A'");
$stmt->bind_param('i', $targetUserId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('El usuario a compartir no existe', 404);
}
$stmt->close();

$stmt = $conn->prepare('INSERT IGNORE INTO MascotaCarnetAcceso (MascotaId, UserId) VALUES (?, ?)');
$stmt->bind_param('ii', $mascotaId, $targetUserId);
$stmt->execute();
$stmt->close();

json_success(null, 'Carnet compartido', 201);
