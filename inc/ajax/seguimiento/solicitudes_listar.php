<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) ? (int) $_GET['cursor'] : 0;
$limit = 20;

$sql =
    "SELECT s.SolicitudId, s.CreatedAt, u.UserId, u.Username, u.NombreCompleto, u.AvatarPath, u.ZonaDescripcion
     FROM SolicitudSeguimiento s
     JOIN Usuario u ON u.UserId = s.UserIdSolicitante
     WHERE s.UserIdDestino = ? AND s.Estado = 'pendiente' AND u.Estado = 'A'";
if ($cursor > 0) {
    $sql .= ' AND s.SolicitudId < ?';
}
$sql .= ' ORDER BY s.SolicitudId DESC LIMIT ?';

$stmt = $conn->prepare($sql);
if ($cursor > 0) {
    $stmt->bind_param('iii', $userId, $cursor, $limit);
} else {
    $stmt->bind_param('ii', $userId, $limit);
}
$stmt->execute();
$res = $stmt->get_result();

$solicitudes = [];
while ($fila = $res->fetch_assoc()) {
    $solicitudes[] = [
        'solicitudId' => (int) $fila['SolicitudId'],
        'createdAt' => $fila['CreatedAt'],
        'usuario' => [
            'userId' => (int) $fila['UserId'],
            'username' => $fila['Username'],
            'nombreCompleto' => $fila['NombreCompleto'],
            'avatarPath' => $fila['AvatarPath'],
            'avatarBust' => rh_avatar_bust($fila['AvatarPath'] ?? null),
            'zonaDescripcion' => $fila['ZonaDescripcion'],
        ],
    ];
}
$stmt->close();

$nextCursor = count($solicitudes) === $limit
    ? $solicitudes[count($solicitudes) - 1]['solicitudId']
    : null;

json_success(['solicitudes' => $solicitudes, 'nextCursor' => $nextCursor]);
