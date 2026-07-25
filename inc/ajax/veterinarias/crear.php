<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/veterinaria.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar una veterinaria', 403);
}

$nombre = trim($_POST['nombre'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$telefono = trim($_POST['telefono'] ?? '') ?: null;
$whatsappNumero = trim($_POST['whatsappNumero'] ?? '') ?: null;
$horario = trim($_POST['horario'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) ? (float) $_POST['zonaLng'] : null;

if ($nombre === '' || mb_strlen($nombre) > 150) {
    json_error('El nombre es obligatorio (máx 150 caracteres)');
}
if ($telefono === null && $whatsappNumero === null) {
    json_error('Indicá al menos un teléfono o número de WhatsApp para contactar');
}
if ($zonaDescripcion === '' || mb_strlen($zonaDescripcion) > 150) {
    json_error('La zona es obligatoria (máx 150 caracteres)');
}
if ($zonaLat === null || $zonaLng === null) {
    json_error('Falta la ubicación de la veterinaria');
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
    'INSERT INTO Veterinaria (UserId, Nombre, Descripcion, Telefono, WhatsappNumero, Horario, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'issssssdd',
    $userId,
    $nombre,
    $descripcion,
    $telefono,
    $whatsappNumero,
    $horario,
    $zonaDescripcion,
    $zonaLat,
    $zonaLng
);
$stmt->execute();
$veterinariaId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_veterinaria($foto, $veterinariaId);
    $stmt = $conn->prepare('INSERT INTO VeterinariaFoto (VeterinariaId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $veterinariaId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT * FROM Veterinaria WHERE VeterinariaId = ?');
$stmt->bind_param('i', $veterinariaId);
$stmt->execute();
$veterinaria = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['veterinaria' => rh_veterinaria_publico($conn, $veterinaria, $userId)], 'Veterinaria creada', 201);
