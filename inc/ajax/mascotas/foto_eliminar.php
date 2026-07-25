<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$userId = rh_require_auth($conn);

$mascotaFotoId = (int) ($_POST['mascotaFotoId'] ?? 0);
if ($mascotaFotoId <= 0) {
    json_error('Falta mascotaFotoId');
}

$stmt = $conn->prepare(
    'SELECT MascotaFoto.MascotaFotoId, MascotaFoto.MascotaId, MascotaFoto.Path, Mascota.UserId
     FROM MascotaFoto
     JOIN Mascota ON Mascota.MascotaId = MascotaFoto.MascotaId
     WHERE MascotaFoto.MascotaFotoId = ?'
);
$stmt->bind_param('i', $mascotaFotoId);
$stmt->execute();
$foto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$foto) {
    json_error('Foto no encontrada', 404);
}
if ((int) $foto['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta foto', 403);
}

$archivo = __DIR__ . '/../../../uploads/' . $foto['Path'];
if (is_file($archivo)) {
    unlink($archivo);
}

$stmt = $conn->prepare('DELETE FROM MascotaFoto WHERE MascotaFotoId = ?');
$stmt->bind_param('i', $mascotaFotoId);
$stmt->execute();
$stmt->close();

json_success(['fotos' => rh_mascota_fotos($conn, (int) $foto['MascotaId'])], 'Foto eliminada');
