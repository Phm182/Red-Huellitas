<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para cargar mascotas', 403);
}

$nombre = trim($_POST['nombre'] ?? '');
$sexo = $_POST['sexo'] ?? '';
$especie = $_POST['especie'] ?? '';
$razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
$razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;
$edadAnios = isset($_POST['edadAnios']) && $_POST['edadAnios'] !== '' ? (int) $_POST['edadAnios'] : null;
$edadMeses = isset($_POST['edadMeses']) && $_POST['edadMeses'] !== '' ? (int) $_POST['edadMeses'] : null;
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$disponibleParaMatch = filter_var($_POST['disponibleParaMatch'] ?? false, FILTER_VALIDATE_BOOLEAN);
$carnetVisibilidad = $_POST['carnetVisibilidad'] ?? 'privada';

if ($nombre === '' || mb_strlen($nombre) > 60) {
    json_error('El nombre es obligatorio (máx 60 caracteres)');
}
if (!in_array($sexo, ['macho', 'hembra'], true)) {
    json_error("El sexo debe ser 'macho' o 'hembra'");
}
if (!in_array($especie, rh_especies_validas(), true)) {
    json_error("Especie no válida");
}
if (!$razaId && !$razaTexto) {
    json_error('Debés indicar una raza (del catálogo o a texto libre)');
}
if (!in_array($carnetVisibilidad, ['publica', 'privada'], true)) {
    json_error("carnetVisibilidad debe ser 'publica' o 'privada'");
}

if ($razaId) {
    $stmt = $conn->prepare('SELECT RazaId FROM RazaCatalogo WHERE RazaId = ? AND Especie = ?');
    $stmt->bind_param('is', $razaId, $especie);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La raza seleccionada no corresponde a esa especie');
    }
    $stmt->close();
    $razaTexto = null;
}

$fotos = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
if (count($fotos) > 6) {
    json_error('Máximo 6 fotos por mascota');
}
foreach ($fotos as $foto) {
    $error = rh_validar_imagen_subida($foto);
    if ($error) {
        json_error("Foto inválida: $error");
    }
}

$carnet = $_FILES['carnet'] ?? null;
if ($carnet && $carnet['error'] !== UPLOAD_ERR_NO_FILE) {
    $error = rh_validar_imagen_subida($carnet);
    if ($error) {
        json_error("Carnet inválido: $error");
    }
}

$stmt = $conn->prepare(
    'INSERT INTO Mascota
        (UserId, Nombre, Sexo, EdadAnios, EdadMeses, Especie, RazaId, RazaTexto, DescripcionTexto, CarnetVisibilidad, DisponibleParaMatch)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$disponibleInt = $disponibleParaMatch ? 1 : 0;
$tipos = implode('', [
    'i', // userId
    's', // nombre
    's', // sexo
    'i', // edadAnios
    'i', // edadMeses
    's', // especie
    'i', // razaId
    's', // razaTexto
    's', // descripcion
    's', // carnetVisibilidad
    'i', // disponibleInt
]);
$stmt->bind_param(
    $tipos,
    $userId,
    $nombre,
    $sexo,
    $edadAnios,
    $edadMeses,
    $especie,
    $razaId,
    $razaTexto,
    $descripcion,
    $carnetVisibilidad,
    $disponibleInt
);
$stmt->execute();
$mascotaId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_mascota($foto, $mascotaId);
    $stmt = $conn->prepare('INSERT INTO MascotaFoto (MascotaId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $mascotaId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

if ($carnet && $carnet['error'] !== UPLOAD_ERR_NO_FILE) {
    $carnetPath = rh_guardar_carnet_vacunas($carnet, $mascotaId, null);
    $stmt = $conn->prepare('UPDATE Mascota SET CarnetVacunasPath = ? WHERE MascotaId = ?');
    $stmt->bind_param('si', $carnetPath, $mascotaId);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['mascota' => rh_mascota_publica($conn, $mascota, $userId)], 'Mascota creada', 201);
