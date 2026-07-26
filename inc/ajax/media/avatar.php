<?php
/**
 * Sirve el avatar de un usuario con Cache-Control: no-store.
 * Evita que el CDN (Hostinger hcdn) siga entregando el JPG viejo de /uploads/
 * cuando se sobrescribe el mismo path.
 *
 * Uso: /inc/ajax/media/avatar.php?u={userId}&v={bust}
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = (int) ($_GET['u'] ?? 0);
if ($userId <= 0) {
    json_error('Falta u (userId)', 400);
}

$stmt = $conn->prepare('SELECT AvatarPath FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row || empty($row['AvatarPath'])) {
    json_error('Sin avatar', 404);
}

$rel = str_replace('\\', '/', (string) $row['AvatarPath']);
if (strpos($rel, '..') !== false || !str_starts_with($rel, 'avatares/')) {
    json_error('Path inválido', 400);
}

$archivo = __DIR__ . '/../../../uploads/' . $rel;
if (!is_file($archivo) || !is_readable($archivo)) {
    json_error('Archivo no encontrado', 404);
}

while (ob_get_level() > 0) {
    ob_end_clean();
}

$mtime = (int) filemtime($archivo);
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $archivo) ?: 'image/jpeg';
finfo_close($finfo);

if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) filesize($archivo));
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('CDN-Cache-Control: no-store');
    header('ETag: "' . $mtime . '"');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
}

readfile($archivo);
exit;
