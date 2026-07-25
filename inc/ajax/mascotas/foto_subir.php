<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}
if (!isset($_FILES['foto'])) {
    json_error('Falta el archivo foto');
}

$stmt = $conn->prepare('SELECT UserId FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$mascota) {
    json_error('Mascota no encontrada', 404);
}
if ((int) $mascota['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta mascota', 403);
}

$stmt = $conn->prepare('SELECT COUNT(*) AS total, MAX(Orden) AS maxOrden FROM MascotaFoto WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$conteo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ((int) $conteo['total'] >= 6) {
    json_error('Esta mascota ya tiene el máximo de 6 fotos');
}

$error = rh_validar_imagen_subida($_FILES['foto']);
if ($error) {
    json_error($error);
}

$path = rh_guardar_foto_mascota($_FILES['foto'], $mascotaId);
$orden = $conteo['maxOrden'] !== null ? ((int) $conteo['maxOrden']) + 1 : 0;

$stmt = $conn->prepare('INSERT INTO MascotaFoto (MascotaId, Path, Orden) VALUES (?, ?, ?)');
$stmt->bind_param('isi', $mascotaId, $path, $orden);
$stmt->execute();
$stmt->close();

json_success(['fotos' => rh_mascota_fotos($conn, $mascotaId)], 'Foto agregada', 201);
