<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

// Sin candado de verificación: comentar es contenido público de baja
// fricción, mismo criterio que reaccionar/dar like (publicaciones/reaccionar.php),
// no que crear un post nuevo.

$postId = (int) ($_POST['postId'] ?? 0);
$texto = trim($_POST['texto'] ?? '');

if ($postId <= 0) {
    json_error('Falta postId');
}
if ($texto === '') {
    json_error('El comentario no puede estar vacío');
}
if (mb_strlen($texto) > 500) {
    json_error('El comentario es demasiado largo (máximo 500 caracteres)');
}

$stmt = $conn->prepare("SELECT UserId FROM Post WHERE PostId = ? AND Estado = 'A'");
$stmt->bind_param('i', $postId);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$post) {
    json_error('Publicación no encontrada', 404);
}
$autorId = (int) $post['UserId'];

$stmt = $conn->prepare('INSERT INTO Comentario (PostId, UserId, Texto) VALUES (?, ?, ?)');
$stmt->bind_param('iis', $postId, $userId, $texto);
$stmt->execute();
$comentarioId = (int) $stmt->insert_id;
$stmt->close();

$stmt = $conn->prepare(
    'SELECT Comentario.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM Comentario JOIN Usuario ON Usuario.UserId = Comentario.UserId
     WHERE ComentarioId = ?'
);
$stmt->bind_param('i', $comentarioId);
$stmt->execute();
$comentario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($autorId !== $userId) {
    $stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $yo = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $nombre = !empty($yo['Username']) ? '@' . $yo['Username'] : ($yo['NombreCompleto'] ?? 'Alguien');

    rh_notificar(
        $conn,
        [$autorId],
        'post_comentario',
        'Nuevo comentario',
        "$nombre comentó tu publicación",
        '/(app)/publicaciones/' . $postId,
        ['actorUserId' => $userId]
    );
}

json_success(['comentario' => rh_comentario_publico($comentario, $userId)], 'Comentario publicado', 201);
