<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$viewerUserId = rh_require_auth($conn);

$postId = (int) ($_GET['postId'] ?? 0);
if ($postId <= 0) {
    json_error('Falta postId');
}

$stmt = $conn->prepare('SELECT * FROM Post WHERE PostId = ?');
$stmt->bind_param('i', $postId);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$post || $post['Estado'] !== 'A') {
    json_error('Publicación no encontrada', 404);
}

json_success(['post' => rh_post_publico($conn, $post, $viewerUserId)]);
