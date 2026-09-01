<?php
/**
 * Soft-delete de un comentario. Permitido para el autor del comentario (se
 * arrepiente de lo que escribió) o para el dueño del post (moderación de su
 * propia publicación) -- a diferencia de publicaciones/eliminar.php, acá hay
 * dos dueños posibles.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$comentarioId = (int) ($_POST['comentarioId'] ?? 0);
if ($comentarioId <= 0) {
    json_error('Falta comentarioId');
}

$stmt = $conn->prepare(
    'SELECT Comentario.UserId AS AutorComentarioId, Post.UserId AS AutorPostId
     FROM Comentario JOIN Post ON Post.PostId = Comentario.PostId
     WHERE Comentario.ComentarioId = ? AND Comentario.Estado = \'A\''
);
$stmt->bind_param('i', $comentarioId);
$stmt->execute();
$fila = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$fila) {
    json_error('Comentario no encontrado', 404);
}

$esAutorComentario = (int) $fila['AutorComentarioId'] === $userId;
$esDuenoPost = (int) $fila['AutorPostId'] === $userId;
if (!$esAutorComentario && !$esDuenoPost) {
    json_error('No tenés permiso para eliminar este comentario', 403);
}

$stmt = $conn->prepare("UPDATE Comentario SET Estado = 'I' WHERE ComentarioId = ?");
$stmt->bind_param('i', $comentarioId);
$stmt->execute();
$stmt->close();

json_success(null, 'Comentario eliminado');
