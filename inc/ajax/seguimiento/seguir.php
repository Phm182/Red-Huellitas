<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/privacidad.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$userIdSeguido = (int) ($_POST['userIdSeguido'] ?? 0);
if ($userIdSeguido <= 0) {
    json_error('Falta userIdSeguido');
}
if ($userIdSeguido === $userId) {
    json_error('No podés seguirte a vos mismo');
}

$stmt = $conn->prepare("SELECT UserId, PerfilPrivado FROM Usuario WHERE UserId = ? AND Estado = 'A'");
$stmt->bind_param('i', $userIdSeguido);
$stmt->execute();
$destino = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$destino) {
    json_error('El usuario no existe', 404);
}

$stmt = $conn->prepare('SELECT SeguimientoId FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
$stmt->bind_param('ii', $userId, $userIdSeguido);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya seguís a este usuario', 409);
}
$stmt->close();

$stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$yo = $stmt->get_result()->fetch_assoc();
$stmt->close();
$nombreYo = !empty($yo['Username']) ? '@' . $yo['Username'] : $yo['NombreCompleto'];

// ------------------------------------------------------------
// Cuenta privada: en vez de seguir directo, se pide permiso.
// ------------------------------------------------------------
if ((int) $destino['PerfilPrivado'] === 1) {
    // ON DUPLICATE vuelve a dejarla pendiente si el usuario reintenta después
    // de un rechazo: si no, un "no" de una vez quedaría siendo para siempre
    // sin que el destinatario lo haya decidido así.
    $stmt = $conn->prepare(
        "INSERT INTO SolicitudSeguimiento (UserIdSolicitante, UserIdDestino, Estado)
         VALUES (?, ?, 'pendiente')
         ON DUPLICATE KEY UPDATE Estado = 'pendiente', ResueltaEn = NULL, CreatedAt = NOW()"
    );
    $stmt->bind_param('ii', $userId, $userIdSeguido);
    $stmt->execute();
    $stmt->close();

    rh_notificar(
        $conn,
        [$userIdSeguido],
        'seguimiento_solicitud',
        'Nueva solicitud',
        $nombreYo . ' quiere seguirte',
        '/(app)/solicitudes',
        ['actorUserId' => $userId]
    );

    json_success(['estado' => 'solicitado'], 'Solicitud enviada', 201);
}

$stmt = $conn->prepare('INSERT INTO Seguimiento (UserIdSeguidor, UserIdSeguido) VALUES (?, ?)');
$stmt->bind_param('ii', $userId, $userIdSeguido);
$stmt->execute();
$stmt->close();

rh_notificar(
    $conn,
    [$userIdSeguido],
    'seguidor_nuevo',
    'Tenés un seguidor nuevo',
    $nombreYo . ' te empezó a seguir',
    !empty($yo['Username']) ? '/(app)/usuario/' . $yo['Username'] : null,
    ['actorUserId' => $userId]
);

json_success(['estado' => 'siguiendo'], 'Ahora seguís a este usuario', 201);
