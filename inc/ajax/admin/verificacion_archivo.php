<?php
/**
 * Sirve una de las tres imágenes de la verificación de identidad (dniFrente,
 * dniDorso, selfie) al moderador. Nunca hay URL pública de estos archivos:
 * viven en inc/storage/verificacion/ (fuera del docroot servible) y sólo
 * salen por acá. Mismo molde que mascotas/carnet_ver.php.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

rh_require_admin($conn);

$userId = (int) ($_GET['userId'] ?? 0);
$tipo = (string) ($_GET['tipo'] ?? '');

if ($userId <= 0) {
    json_error('Falta userId');
}

$columnas = [
    'dniFrente' => 'DniFrentePath',
    'dniDorso' => 'DniDorsoPath',
    'selfie' => 'SelfiePath',
];
if (!isset($columnas[$tipo])) {
    json_error('tipo inválido (dniFrente, dniDorso o selfie)');
}

$stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$verificacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$verificacion || empty($verificacion[$columnas[$tipo]])) {
    json_error('Archivo no encontrado', 404);
}

// basename() defensivo: el path sale de la DB, pero no se confía en que no
// tenga ../ — el nombre de archivo es lo único que hace falta.
$archivo = rh_dir_verificacion_usuario($userId) . '/' . basename((string) $verificacion[$columnas[$tipo]]);
if (!is_file($archivo)) {
    json_error('Archivo no encontrado', 404);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $archivo);
finfo_close($finfo);

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($archivo));
header('Cache-Control: private, max-age=0, no-cache');
readfile($archivo);
exit;
