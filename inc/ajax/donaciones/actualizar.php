<?php
/**
 * Editar una publicación de donación (sólo el dueño).
 *
 * `tipo` (necesito/ofrezco) no se puede cambiar: dar vuelta el sentido de una
 * publicación que ya circuló confundiría a cualquiera que la haya visto.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/donacion.php';
require_once __DIR__ . '/../../funciones/edicion.php';

$userId = rh_require_auth($conn);

$donacionId = (int) ($_POST['donacionId'] ?? 0);
if ($donacionId <= 0) {
    json_error('Falta donacionId');
}

$sqlDetalle =
    'SELECT Donacion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM Donacion JOIN Usuario ON Usuario.UserId = Donacion.UserId
     WHERE Donacion.DonacionId = ?';

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$donacion || $donacion['Estado'] !== 'A') {
    json_error('Publicación no encontrada', 404);
}
if ((int) $donacion['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta publicación', 403);
}

$lock = rh_donacion_motivo_bloqueo_edicion($donacion);
if ($lock !== null) {
    json_error($lock, 409);
}

$categoria = $_POST['categoria'] ?? '';
$descripcion = trim($_POST['descripcion'] ?? '');
$especie = trim($_POST['especie'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) && $_POST['zonaLat'] !== '' ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) && $_POST['zonaLng'] !== '' ? (float) $_POST['zonaLng'] : null;

if (!in_array($categoria, ['alimento', 'insumo', 'ropa'], true)) {
    json_error("categoria debe ser 'alimento', 'insumo' o 'ropa'");
}
if ($descripcion === '') {
    json_error('La descripción es obligatoria');
}
if ($especie !== null && !in_array($especie, rh_especies_validas(), true)) {
    json_error("Especie no válida");
}
if ($zonaDescripcion === '' || mb_strlen($zonaDescripcion) > 150) {
    json_error('La zona es obligatoria (máx 150 caracteres)');
}
if ($zonaLat === null || $zonaLng === null) {
    json_error('Falta la ubicación de la donación');
}

$stmt = $conn->prepare(
    'UPDATE Donacion
     SET Categoria = ?, Descripcion = ?, Especie = ?, ZonaDescripcion = ?, ZonaLat = ?, ZonaLng = ?
     WHERE DonacionId = ? AND UserId = ?'
);
$stmt->bind_param(
    'ssssddii',
    $categoria, $descripcion, $especie, $zonaDescripcion, $zonaLat, $zonaLng, $donacionId, $userId
);
$stmt->execute();
$stmt->close();

rh_sincronizar_fotos(
    $conn,
    'Donacion',
    $donacionId,
    $_POST['ordenFotos'] ?? null,
    $_FILES['fotos'] ?? null,
    'rh_guardar_foto_donacion'
);

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$actualizada = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['donacion' => rh_donacion_publico($conn, $actualizada, $userId)], 'Publicación actualizada');
