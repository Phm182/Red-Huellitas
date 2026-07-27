<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$solicitudId = (int) ($_POST['solicitudId'] ?? 0);
$accion = trim($_POST['accion'] ?? '');

if ($solicitudId <= 0) {
    json_error('Falta solicitudId');
}
if (!in_array($accion, ['aceptar', 'rechazar'], true)) {
    json_error('Acción inválida');
}

// El WHERE incluye el destino: sin eso cualquiera podría aceptar solicitudes
// ajenas mandando un id que no es suyo.
$stmt = $conn->prepare(
    "SELECT SolicitudId, UserIdSolicitante FROM SolicitudSeguimiento
     WHERE SolicitudId = ? AND UserIdDestino = ? AND Estado = 'pendiente'"
);
$stmt->bind_param('ii', $solicitudId, $userId);
$stmt->execute();
$solicitud = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$solicitud) {
    json_error('La solicitud no existe o ya fue resuelta', 404);
}

$solicitanteId = (int) $solicitud['UserIdSolicitante'];
$nuevoEstado = $accion === 'aceptar' ? 'aceptada' : 'rechazada';

$stmt = $conn->prepare('UPDATE SolicitudSeguimiento SET Estado = ?, ResueltaEn = NOW() WHERE SolicitudId = ?');
$stmt->bind_param('si', $nuevoEstado, $solicitudId);
$stmt->execute();
$stmt->close();

if ($accion === 'aceptar') {
    // INSERT IGNORE: si por alguna carrera ya existía el seguimiento, aceptar
    // no tiene que reventar.
    $stmt = $conn->prepare('INSERT IGNORE INTO Seguimiento (UserIdSeguidor, UserIdSeguido) VALUES (?, ?)');
    $stmt->bind_param('ii', $solicitanteId, $userId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $yo = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $nombreYo = !empty($yo['Username']) ? '@' . $yo['Username'] : $yo['NombreCompleto'];

    rh_notificar(
        $conn,
        [$solicitanteId],
        'seguimiento_aceptada',
        'Solicitud aceptada',
        $nombreYo . ' aceptó tu solicitud',
        !empty($yo['Username']) ? '/(app)/usuario/' . $yo['Username'] : null,
        ['actorUserId' => $userId]
    );
}
// Al rechazar no se avisa a propósito: enterarte de que te dijeron que no es
// peor que no enterarte, y habilita insistir.

json_success(['estado' => $nuevoEstado], $accion === 'aceptar' ? 'Solicitud aceptada' : 'Solicitud rechazada');
