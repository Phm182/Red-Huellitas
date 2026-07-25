<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$viewerUserId = rh_require_auth($conn);

$mascotaId = (int) ($_GET['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$mascota) {
    json_error('Mascota no encontrada', 404);
}
if ($mascota['Estado'] !== 'A' && (int) $mascota['UserId'] !== $viewerUserId) {
    json_error('Mascota no encontrada', 404);
}

json_success(['mascota' => rh_mascota_publica($conn, $mascota, $viewerUserId)]);
