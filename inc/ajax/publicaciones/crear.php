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

$fotos = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
if (count($fotos) > 6) {
    json_error('Máximo 6 fotos por publicación');
}
if ($texto === null && count($fotos) === 0) {
    json_error('La publicación necesita texto o al menos una foto');
}
foreach ($fotos as $foto) {
    $error = rh_validar_imagen_subida($foto);
    if ($error) {
        json_error("Foto inválida: $error");
    }
}

$stmt = $conn->prepare('INSERT INTO Post (UserId, Texto) VALUES (?, ?)');
$stmt->bind_param('is', $userId, $texto);
$stmt->execute();
$postId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_post($foto, $postId);
    $stmt = $conn->prepare('INSERT INTO PostFoto (PostId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $postId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT * FROM Post WHERE PostId = ?');
$stmt->bind_param('i', $postId);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['post' => rh_post_publico($conn, $post, $userId)], 'Publicación creada', 201);
