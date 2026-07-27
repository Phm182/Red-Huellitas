<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/privacidad.php';

$viewerUserId = rh_require_auth($conn);

$username = trim($_GET['username'] ?? '');
$targetUserId = (int) ($_GET['userId'] ?? 0);

if ($username !== '') {
    $stmt = $conn->prepare("SELECT * FROM Usuario WHERE Username = ? AND Estado = 'A'");
    $stmt->bind_param('s', $username);
} elseif ($targetUserId > 0) {
    $stmt = $conn->prepare("SELECT * FROM Usuario WHERE UserId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $targetUserId);
} else {
    json_error('Falta username o userId');
}

$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$usuario) {
    json_error('Usuario no encontrado', 404);
}

$targetUserId = (int) $usuario['UserId'];
$esUnoMismo = $targetUserId === $viewerUserId;

$stmt = $conn->prepare('SELECT COUNT(*) AS total FROM Seguimiento WHERE UserIdSeguido = ?');
$stmt->bind_param('i', $targetUserId);
$stmt->execute();
$totalSeguidores = (int) $stmt->get_result()->fetch_assoc()['total'];
$stmt->close();

$stmt = $conn->prepare('SELECT COUNT(*) AS total FROM Seguimiento WHERE UserIdSeguidor = ?');
$stmt->bind_param('i', $targetUserId);
$stmt->execute();
$totalSeguidos = (int) $stmt->get_result()->fetch_assoc()['total'];
$stmt->close();

$siguiendoYo = false;
if (!$esUnoMismo) {
    $stmt = $conn->prepare('SELECT SeguimientoId FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
    $stmt->bind_param('ii', $viewerUserId, $targetUserId);
    $stmt->execute();
    $siguiendoYo = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

// La ficha de una cuenta privada se ve igual (nombre, avatar, contadores): si
// no, no habría forma de encontrar a alguien para pedirle seguirlo. Lo que se
// corta es el contenido, y de eso se encargan los endpoints de listado.
$puedeVer = rh_puede_ver_perfil($conn, $viewerUserId, $targetUserId);
$estadoSeguimiento = rh_estado_seguimiento($conn, $viewerUserId, $targetUserId);

// El WhatsApp sí es dato de contacto: en una cuenta privada no se filtra ni
// aunque esté marcado como público.
$whatsappVisible = $esUnoMismo || ($puedeVer && $usuario['WhatsappVisibilidad'] === 'publica');

json_success([
    'userId' => $targetUserId,
    'username' => $usuario['Username'],
    'nombreCompleto' => $usuario['NombreCompleto'],
    'zonaDescripcion' => $usuario['ZonaDescripcion'],
    'avatarPath' => $usuario['AvatarPath'],
    'avatarBust' => rh_avatar_bust($usuario['AvatarPath'] ?? null),
    'whatsappNumero' => $whatsappVisible ? $usuario['WhatsappNumero'] : null,
    'whatsappVisibilidad' => $usuario['WhatsappVisibilidad'],
    'totalSeguidores' => $totalSeguidores,
    'totalSeguidos' => $totalSeguidos,
    'siguiendoYo' => $siguiendoYo,
    'esUnoMismo' => $esUnoMismo,
    'perfilPrivado' => (bool) ($usuario['PerfilPrivado'] ?? 0),
    'puedeVerContenido' => $puedeVer,
    'estadoSeguimiento' => $estadoSeguimiento,
    'mensajePersonal' => $usuario['MensajePersonal'] ?? null,
]);
