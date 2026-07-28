<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/equipo.php';

$userId = rh_require_auth($conn);

$equipoId = (int) ($_POST['equipoId'] ?? 0);
if ($equipoId <= 0) {
    json_error('Falta equipoId');
}

$stmt = $conn->prepare('SELECT * FROM Equipo WHERE EquipoId = ?');
$stmt->bind_param('i', $equipoId);
$stmt->execute();
$equipo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$equipo || $equipo['Estado'] !== 'A') {
    json_error('Equipo no encontrado', 404);
}
if (!rh_equipo_puede_administrar($conn, $equipoId, $userId)) {
    json_error('Sólo el dueño o un admin del equipo puede editarlo', 403);
}

$nombre = trim($_POST['nombre'] ?? '');
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
if ($direccion !== null && mb_strlen($direccion) > 200) {
    json_error('La dirección no puede superar los 200 caracteres');
}
if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('El email no parece válido');
}

// El tipo se puede corregir (alguien se registró como "otro" y en realidad es
// una ONG), pero `Verificado` no: eso lo pone moderación.
$tipoEquipoId = (int) $equipo['TipoEquipoId'];
$tipoCodigo = trim($_POST['tipo'] ?? '');
if ($tipoCodigo !== '') {
    $stmt = $conn->prepare('SELECT TipoEquipoId FROM TipoEquipoCatalogo WHERE Codigo = ?');
    $stmt->bind_param('s', $tipoCodigo);
    $stmt->execute();
    $t = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$t) {
        json_error('Tipo de equipo inválido');
    }
    $tipoEquipoId = (int) $t['TipoEquipoId'];
}

$stmt = $conn->prepare(
    'UPDATE Equipo
     SET TipoEquipoId = ?, Nombre = ?, Descripcion = ?, Email = ?, Telefono = ?,
         SitioWeb = ?, Direccion = ?, ZonaDescripcion = ?, ZonaLat = ?, ZonaLng = ?
     WHERE EquipoId = ?'
);
$stmt->bind_param(
    'isssssssddi',
    $tipoEquipoId,
    $nombre,
    $descripcion,
    $email,
    $telefono,
    $sitioWeb,
    $direccion,
    $zonaDescripcion,
    $zonaLat,
    $zonaLng,
    $equipoId
);
$stmt->execute();
$stmt->close();

$avatar = $_FILES['avatar'] ?? null;
if ($avatar && ($avatar['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $error = rh_validar_imagen_subida($avatar);
    if ($error) {
        json_error("Avatar inválido: $error");
    }
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

json_success(['equipo' => rh_equipo_publico($conn, $equipo, $userId)], 'Equipo actualizado');
