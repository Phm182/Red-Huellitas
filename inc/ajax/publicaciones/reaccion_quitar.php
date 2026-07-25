<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$userId = rh_require_auth($conn);

$postId = (int) ($_POST['postId'] ?? 0);
if ($postId <= 0) {
    json_error('Falta postId');
}

$stmt = $conn->prepare('DELETE FROM PostReaccion WHERE PostId = ? AND UserId = ?');
$stmt->bind_param('ii', $postId, $userId);
$stmt->execute();
$stmt->close();

json_success([
    'miReaccion' => null,
    'conteos' => rh_post_conteos($conn, $postId),
]);
