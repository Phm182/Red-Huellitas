<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$viewerUserId = rh_require_auth($conn);

$tipoUsuarioCodigo = trim($_GET['tipoUsuarioCodigo'] ?? '');
if ($tipoUsuarioCodigo === '') {
    json_error('Falta tipoUsuarioCodigo');
}

$stmt = $conn->prepare('SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = ?');
$stmt->bind_param('s', $tipoUsuarioCodigo);
$stmt->execute();
$tipo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$tipo) {
    json_error('Tipo de usuario desconocido', 404);
}

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

$sql = "SELECT Post.* FROM Post
        JOIN Usuario ON Usuario.UserId = Post.UserId
        WHERE Usuario.TipoUsuarioId = ? AND Post.Estado = 'A'";
$types = 'i';
$params = [(int) $tipo['TipoUsuarioId']];
if ($cursor !== null) {
    $sql .= ' AND Post.PostId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY Post.PostId DESC LIMIT ' . $limit;

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
