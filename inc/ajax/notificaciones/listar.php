<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 25;
// `mascotaId` filtra las de un animal puntual, para la tarjeta de interacciones
// dentro de la mascota.
$mascotaId = isset($_GET['mascotaId']) && $_GET['mascotaId'] !== '' ? (int) $_GET['mascotaId'] : null;

$sql = 'SELECT * FROM Notificacion WHERE UserId = ?';
$types = 'i';
$params = [$userId];

if ($mascotaId !== null) {
    $sql .= ' AND MascotaId = ?';
    $types .= 'i';
    $params[] = $mascotaId;
}
if ($cursor !== null) {
    $sql .= ' AND NotificacionId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY NotificacionId DESC LIMIT ?';
$types .= 'i';
$params[] = $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$notificaciones = [];
while ($fila = $res->fetch_assoc()) {
    $notificaciones[] = rh_notificacion_serializar($fila);
}
$stmt->close();

$nextCursor = count($notificaciones) === $limit
    ? $notificaciones[count($notificaciones) - 1]['notificacionId']
    : null;

json_success(['notificaciones' => $notificaciones, 'nextCursor' => $nextCursor]);
