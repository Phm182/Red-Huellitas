<?php
/**
 * Feed de Shorts: cronológico simple sobre Post WHERE VideoPath IS NOT NULL.
 * Sin split seguido/recomendado por ahora (a diferencia de feed.php) — un
 * ranking más sofisticado es un cambio de query futuro, sin tocar esquema.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$viewerUserId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 10;

$sql = "SELECT * FROM Post WHERE VideoPath IS NOT NULL AND Estado = 'A'";
$types = '';
$params = [];
if ($cursor !== null) {
    $sql .= ' AND PostId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY PostId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$posts = [];
while ($row = $result->fetch_assoc()) {
    $posts[] = rh_post_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($posts) === $limit ? $posts[count($posts) - 1]['postId'] : null;

json_success(['posts' => $posts, 'nextCursor' => $nextCursor]);
