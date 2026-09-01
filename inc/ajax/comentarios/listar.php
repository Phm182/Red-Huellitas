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

$stmt = $conn->prepare("SELECT PostId FROM Post WHERE PostId = ? AND Estado = 'A'");
$stmt->bind_param('i', $postId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Publicación no encontrada', 404);
}
$stmt->close();

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

$sql = "SELECT Comentario.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
        FROM Comentario JOIN Usuario ON Usuario.UserId = Comentario.UserId
        WHERE Comentario.PostId = ? AND Comentario.Estado = 'A'";
$types = 'i';
$params = [$postId];
if ($cursor !== null) {
    $sql .= ' AND Comentario.ComentarioId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY Comentario.ComentarioId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$comentarios = [];
while ($row = $result->fetch_assoc()) {
    $comentarios[] = rh_comentario_publico($row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($comentarios) === $limit ? $comentarios[count($comentarios) - 1]['comentarioId'] : null;

json_success(['comentarios' => $comentarios, 'nextCursor' => $nextCursor]);
