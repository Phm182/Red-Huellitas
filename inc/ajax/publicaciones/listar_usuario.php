<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';
require_once __DIR__ . '/../../funciones/privacidad.php';

$viewerUserId = rh_require_auth($conn);

$targetUserId = (int) ($_GET['userId'] ?? 0);
if ($targetUserId <= 0) {
    json_error('Falta userId');
}

rh_require_ver_perfil($conn, $viewerUserId, $targetUserId);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

$sql = "SELECT * FROM Post WHERE UserId = ? AND Estado = 'A'";
$types = 'i';
$params = [$targetUserId];
if ($cursor !== null) {
    $sql .= ' AND PostId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY PostId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    $posts[] = rh_post_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($posts) === $limit ? $posts[count($posts) - 1]['postId'] : null;

json_success(['posts' => $posts, 'nextCursor' => $nextCursor]);
