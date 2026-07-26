<?php
/**
 * Sirve una imagen de verificación al dueño autenticado (dniFrente, dniDorso,
 * selfie). Misma idea que admin/verificacion_archivo.php pero sólo para el
 * UserId de la sesión — para que al reabrir la pantalla vea lo que ya subió.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);
$tipo = (string) ($_GET['tipo'] ?? '');

$columnas = [
    'dniFrente' => 'DniFrentePath',
    'dniDorso' => 'DniDorsoPath',
    'selfie' => 'SelfiePath',
];
if (!isset($columnas[$tipo])) {
    json_error('tipo inválido (dniFrente, dniDorso, selfie)');
}

$stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$verificacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$verificacion || empty($verificacion[$columnas[$tipo]])) {
    json_error('Archivo no encontrado', 404);
}

$archivo = rh_dir_verificacion_usuario($userId) . '/' . basename((string) $verificacion[$columnas[$tipo]]);
rh_servir_archivo_privado($archivo);
