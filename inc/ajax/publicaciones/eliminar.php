<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$postId = (int) ($_POST['postId'] ?? 0);
if ($postId <= 0) {
    json_error('Falta postId');
}

$stmt = $conn->prepare('SELECT UserId FROM Post WHERE PostId = ?');
$stmt->bind_param('i', $postId);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$post) {
    json_error('Publicación no encontrada', 404);
}
if ((int) $post['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta publicación', 403);
}

$stmt = $conn->prepare("UPDATE Post SET Estado = 'I' WHERE PostId = ?");
$stmt->bind_param('i', $postId);
$stmt->execute();
$stmt->close();

json_success(null, 'Publicación eliminada');
