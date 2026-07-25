<?php
/**
 * Sirve el archivo del carnet de vacunas (nunca una URL pública directa).
 * Requiere ser el dueño, que el carnet sea público, o tener un grant en
 * MascotaCarnetAcceso.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$viewerUserId = rh_require_auth($conn);

$mascotaId = (int) ($_GET['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$mascota || empty($mascota['CarnetVacunasPath'])) {
    json_error('Carnet no encontrado', 404);
}
if (!rh_mascota_tiene_acceso_carnet($conn, $mascota, $viewerUserId)) {
    json_error('No tenés acceso a este carnet', 403);
}

$archivo = rh_dir_carnet_mascota($mascotaId) . '/' . basename($mascota['CarnetVacunasPath']);
if (!is_file($archivo)) {
    json_error('Carnet no encontrado', 404);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $archivo);
finfo_close($finfo);

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($archivo));
header('Cache-Control: private, max-age=0, no-cache');
readfile($archivo);
exit;
