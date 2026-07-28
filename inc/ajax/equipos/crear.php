<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/equipo.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para crear un equipo', 403);
}

$nombre = trim($_POST['nombre'] ?? '');
$tipoCodigo = trim($_POST['tipo'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$email = trim($_POST['email'] ?? '') ?: null;
$telefono = trim($_POST['telefono'] ?? '') ?: null;
$sitioWeb = trim($_POST['sitioWeb'] ?? '') ?: null;
$direccion = trim($_POST['direccion'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '') ?: null;
$zonaLat = isset($_POST['zonaLat']) && $_POST['zonaLat'] !== '' ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) && $_POST['zonaLng'] !== '' ? (float) $_POST['zonaLng'] : null;

if ($nombre === '' || mb_strlen($nombre) > 150) {
    json_error('El nombre es obligatorio (máx 150 caracteres)');
}
if ($descripcion !== null && mb_strlen($descripcion) > 2000) {
    json_error('La descripción no puede superar los 2000 caracteres');
}
if ($direccion !== null && mb_strlen($direccion) > 200) {
    json_error('La dirección no puede superar los 200 caracteres');
}
if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('El email no parece válido');
}

$stmt = $conn->prepare('SELECT TipoEquipoId FROM TipoEquipoCatalogo WHERE Codigo = ?');
$stmt->bind_param('s', $tipoCodigo);
$stmt->execute();
$tipo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$tipo) {
    json_error('Elegí un tipo de equipo válido');
}
$tipoEquipoId = (int) $tipo['TipoEquipoId'];

// Dos equipos con el mismo nombre son casi siempre la misma organización
// cargada dos veces. En vez de dejarlo pasar y que la gente no sepa a cuál
// unirse, se avisa y se ofrece el que ya existe.
$stmt = $conn->prepare("SELECT EquipoId, Nombre FROM Equipo WHERE Nombre = ? AND Estado = 'A'");
$stmt->bind_param('s', $nombre);
$stmt->execute();
$duplicado = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($duplicado) {
    json_error(
        'Ya existe un equipo con ese nombre. Si es el tuyo, pedí unirte en vez de crear otro.',
        409,
        ['equipoIdExistente' => (int) $duplicado['EquipoId']]
    );
}

$avatar = $_FILES['avatar'] ?? null;
if ($avatar && ($avatar['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $error = rh_validar_imagen_subida($avatar);
    if ($error) {
        json_error("Avatar inválido: $error");
    }
} else {
    $avatar = null;
}

$stmt = $conn->prepare(
    'INSERT INTO Equipo
        (TipoEquipoId, Nombre, Descripcion, Email, Telefono, SitioWeb, Direccion, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'isssssssdd',
    $tipoEquipoId,
    $nombre,
    $descripcion,
    $email,
    $telefono,
    $sitioWeb,
    $direccion,
    $zonaDescripcion,
    $zonaLat,
    $zonaLng
);
$stmt->execute();
$equipoId = (int) $stmt->insert_id;
$stmt->close();

// Quien lo crea queda como dueño y activo: si tuviera que aprobarse a sí
// mismo, el equipo nacería sin nadie que pueda aprobar nada.
$stmt = $conn->prepare(
    "INSERT INTO EquipoMiembro (EquipoId, UserId, Rol, Estado, ResueltoEn, ResueltoPorUserId)
     VALUES (?, ?, 'dueno', 'activo', NOW(), ?)"
);
$stmt->bind_param('iii', $equipoId, $userId, $userId);
$stmt->execute();
$stmt->close();

if ($avatar) {
    $path = rh_guardar_avatar_equipo($avatar, $equipoId);
    $stmt = $conn->prepare('UPDATE Equipo SET AvatarPath = ? WHERE EquipoId = ?');
    $stmt->bind_param('si', $path, $equipoId);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT * FROM Equipo WHERE EquipoId = ?');
$stmt->bind_param('i', $equipoId);
$stmt->execute();
$equipo = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['equipo' => rh_equipo_publico($conn, $equipo, $userId)], 'Equipo creado');
