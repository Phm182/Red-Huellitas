<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

if (!isset($_POST['perfilPrivado'])) {
    json_error('Falta perfilPrivado');
}
$perfilPrivado = filter_var($_POST['perfilPrivado'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;

$stmt = $conn->prepare('UPDATE Usuario SET PerfilPrivado = ? WHERE UserId = ?');
$stmt->bind_param('ii', $perfilPrivado, $userId);
$stmt->execute();
$stmt->close();

// Los seguidores actuales se conservan a propósito: ya tenían acceso y
// echarlos sería destruir datos por un cambio de setting. Al volver a público
// tampoco se toca nada.

$pendientes = 0;
if ($perfilPrivado === 1) {
    $stmt = $conn->prepare("SELECT COUNT(*) AS n FROM SolicitudSeguimiento WHERE UserIdDestino = ? AND Estado = 'pendiente'");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $pendientes = (int) $stmt->get_result()->fetch_assoc()['n'];
    $stmt->close();
}

json_success(
    ['perfilPrivado' => (bool) $perfilPrivado, 'solicitudesPendientes' => $pendientes],
    $perfilPrivado === 1 ? 'Tu cuenta ahora es privada' : 'Tu cuenta ahora es pública'
);
