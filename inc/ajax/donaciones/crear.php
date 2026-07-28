<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/donacion.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar una donación', 403);
}

$tipo = $_POST['tipo'] ?? '';
$categoria = $_POST['categoria'] ?? '';
$descripcion = trim($_POST['descripcion'] ?? '');
$especie = trim($_POST['especie'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) ? (float) $_POST['zonaLng'] : null;

if (!in_array($tipo, ['necesito', 'ofrezco'], true)) {
    json_error("tipo debe ser 'necesito' o 'ofrezco'");
}
if (!in_array($categoria, ['alimento', 'insumo'], true)) {
    json_error("categoria debe ser 'alimento' o 'insumo'");
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

$fotos = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
if (count($fotos) > 6) {
    json_error('Máximo 6 fotos por publicación');
}
foreach ($fotos as $foto) {
    $error = rh_validar_imagen_subida($foto);
    if ($error) {
        json_error("Foto inválida: $error");
    }
}

$stmt = $conn->prepare(
    'INSERT INTO Donacion (UserId, Tipo, Categoria, Descripcion, Especie, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'isssssdd',
    $userId,
    $tipo,
    $categoria,
    $descripcion,
    $especie,
    $zonaDescripcion,
    $zonaLat,
    $zonaLng
);
$stmt->execute();
$donacionId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_donacion($foto, $donacionId);
    $stmt = $conn->prepare('INSERT INTO DonacionFoto (DonacionId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $donacionId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare(
    'SELECT Donacion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM Donacion JOIN Usuario ON Usuario.UserId = Donacion.UserId
     WHERE Donacion.DonacionId = ?'
);
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['donacion' => rh_donacion_publico($conn, $donacion, $userId)], 'Publicación de donación creada', 201);
