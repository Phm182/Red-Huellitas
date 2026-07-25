<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar', 403);
}

$texto = trim($_POST['texto'] ?? '') ?: null;
if ($texto !== null && mb_strlen($texto) > 2200) {
    json_error('El texto no puede superar los 2200 caracteres');
}

$duracionSegundos = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : null;

if (!isset($_FILES['video'])) {
    json_error('Falta el video');
}

$error = rh_validar_video_subido($_FILES['video'], $duracionSegundos);
if ($error) {
    json_error("Video inválido: $error");
}

$stmt = $conn->prepare('INSERT INTO Post (UserId, Texto, DuracionSegundos) VALUES (?, ?, ?)');
$stmt->bind_param('isi', $userId, $texto, $duracionSegundos);
$stmt->execute();
$postId = (int) $stmt->insert_id;
$stmt->close();

$videoPath = rh_guardar_video_post($_FILES['video'], $postId);

$stmt = $conn->prepare('UPDATE Post SET VideoPath = ? WHERE PostId = ?');
$stmt->bind_param('si', $videoPath, $postId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT * FROM Post WHERE PostId = ?');
$stmt->bind_param('i', $postId);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['post' => rh_post_publico($conn, $post, $userId)], 'Short creado', 201);
