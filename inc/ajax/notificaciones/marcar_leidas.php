<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

// Sin parámetros marca todo; con `mascotaId` sólo las de ese animal (al abrir
// su ficha), y con `notificacionId` una sola (al tocarla).
$mascotaId = isset($_POST['mascotaId']) && $_POST['mascotaId'] !== '' ? (int) $_POST['mascotaId'] : null;
$notificacionId = isset($_POST['notificacionId']) && $_POST['notificacionId'] !== ''
    ? (int) $_POST['notificacionId']
    : null;

if ($notificacionId !== null) {
    $stmt = $conn->prepare('UPDATE Notificacion SET Leida = 1 WHERE UserId = ? AND NotificacionId = ?');
    $stmt->bind_param('ii', $userId, $notificacionId);
} elseif ($mascotaId !== null) {
    $stmt = $conn->prepare('UPDATE Notificacion SET Leida = 1 WHERE UserId = ? AND MascotaId = ?');
    $stmt->bind_param('ii', $userId, $mascotaId);
} else {
    $stmt = $conn->prepare('UPDATE Notificacion SET Leida = 1 WHERE UserId = ? AND Leida = 0');
    $stmt->bind_param('i', $userId);
}
$stmt->execute();
$stmt->close();

json_success(rh_notificaciones_contadores($conn, $userId), 'Listo');
