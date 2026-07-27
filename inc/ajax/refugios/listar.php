<?php
/**
 * Refugios y protectoras: usuarios registrados con ese tipo de cuenta.
 *
 * No hace falta una tabla nueva — TipoUsuarioCatalogo ya distingue 'refugio'
 * desde el registro, pero hasta ahora no se usaba para nada más.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = 20;

$sql =
    "SELECT u.UserId, u.Username, u.NombreCompleto, u.AvatarPath, u.ZonaDescripcion, u.ZonaLat, u.ZonaLng
     FROM Usuario u
     JOIN TipoUsuarioCatalogo t ON t.TipoUsuarioId = u.TipoUsuarioId
     WHERE t.Codigo = 'refugio' AND u.Estado = 'A' AND u.OnboardingCompleto = 'Y'";
$types = '';
$params = [];
if ($cursor !== null) {
    $sql .= ' AND u.UserId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY u.UserId DESC LIMIT ?';
$types .= 'i';
$params[] = $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$refugios = [];
while ($f = $res->fetch_assoc()) {
    $refugios[] = [
        'userId' => (int) $f['UserId'],
        'username' => $f['Username'],
        'nombreCompleto' => $f['NombreCompleto'],
        'avatarPath' => $f['AvatarPath'],
        'avatarBust' => rh_avatar_bust($f['AvatarPath'] ?? null),
        'zonaDescripcion' => $f['ZonaDescripcion'],
    ];
}
$stmt->close();

$nextCursor = count($refugios) === $limit ? $refugios[count($refugios) - 1]['userId'] : null;

json_success(['refugios' => $refugios, 'nextCursor' => $nextCursor]);
