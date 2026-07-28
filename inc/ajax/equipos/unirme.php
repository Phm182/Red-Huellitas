<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$equipoId = (int) ($_POST['equipoId'] ?? 0);
$mensaje = trim($_POST['mensaje'] ?? '') ?: null;

if ($equipoId <= 0) {
    json_error('Falta equipoId');
}
if ($mensaje !== null && mb_strlen($mensaje) > 300) {
    json_error('El mensaje no puede superar los 300 caracteres');
}

$stmt = $conn->prepare('SELECT EquipoId, Nombre, Estado FROM Equipo WHERE EquipoId = ?');
$stmt->bind_param('i', $equipoId);
$stmt->execute();
$equipo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$equipo || $equipo['Estado'] !== 'A') {
    json_error('Equipo no encontrado', 404);
}

$membresia = rh_equipo_membresia($conn, $equipoId, $userId);

if ($membresia && $membresia['estado'] === 'activo') {
    json_error('Ya sos parte de este equipo', 409);
}
if ($membresia && $membresia['estado'] === 'pendiente') {
    json_error('Ya pediste unirte. Está esperando que lo aprueben.', 409);
}

// Si antes se fue o lo rechazaron, se reabre el mismo pedido en vez de
// crear otro: la UNIQUE (EquipoId, UserId) no admite dos filas, y conservar
// la fila deja el historial de que ya había pasado por acá.
if ($membresia) {
    $stmt = $conn->prepare(
        "UPDATE EquipoMiembro
         SET Estado = 'pendiente', Mensaje = ?, CreatedAt = NOW(),
             ResueltoEn = NULL, ResueltoPorUserId = NULL
         WHERE EquipoMiembroId = ?"
    );
    $stmt->bind_param('si', $mensaje, $membresia['equipoMiembroId']);
    $stmt->execute();
    $stmt->close();
} else {
    $stmt = $conn->prepare(
        "INSERT INTO EquipoMiembro (EquipoId, UserId, Rol, Estado, Mensaje)
         VALUES (?, ?, 'miembro', 'pendiente', ?)"
    );
    $stmt->bind_param('iis', $equipoId, $userId, $mensaje);
    $stmt->execute();
    $stmt->close();
}

// Avisar a los que pueden aprobarlo, o el pedido queda esperando para siempre.
$stmt = $conn->prepare(
    "SELECT UserId FROM EquipoMiembro
     WHERE EquipoId = ? AND Estado = 'activo' AND Rol IN ('dueno','admin')"
);
$stmt->bind_param('i', $equipoId);
$stmt->execute();
$res = $stmt->get_result();
$admins = [];
while ($row = $res->fetch_assoc()) {
    $admins[] = (int) $row['UserId'];
}
$stmt->close();

$stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$yo = $stmt->get_result()->fetch_assoc();
$stmt->close();

rh_notificar(
    $conn,
    $admins,
    'equipo_solicitud',
    'Pedido para unirse a ' . $equipo['Nombre'],
    ($yo['NombreCompleto'] ?? 'Alguien') . ' quiere sumarse al equipo',
    '/(app)/equipos/' . $equipoId,
    ['actorUserId' => $userId]
);

json_success(null, 'Pedido enviado. Te avisamos cuando lo aprueben.');
