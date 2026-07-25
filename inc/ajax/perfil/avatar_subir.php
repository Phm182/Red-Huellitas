<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);

if (!isset($_FILES['avatar'])) {
    json_error('Falta el archivo avatar');
}

$error = rh_validar_imagen_subida($_FILES['avatar']);
if ($error) {
    json_error($error);
}

$path = rh_guardar_avatar($_FILES['avatar'], $userId);
if (!$path) {
    json_error('No se pudo procesar la imagen', 500);
}

$stmt = $conn->prepare('UPDATE Usuario SET AvatarPath = ? WHERE UserId = ?');
$stmt->bind_param('si', $path, $userId);
$stmt->execute();
$stmt->close();

// URL pública relativa al root del proyecto (uploads/ es servido directo por Apache).
$avatarUrl = '/Red Huellitas/uploads/' . $path;

json_success(['avatarUrl' => $avatarUrl], 'Avatar actualizado');
