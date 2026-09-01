<?php
/**
 * "Me interesa" en una publicación de donación -- levantar la mano, sin el
 * cuestionario dinámico que tiene Adopción (adopcion/postular.php): sólo un
 * mensaje opcional de una línea.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para interesarte', 403);
}

$donacionId = (int) ($_POST['donacionId'] ?? 0);
if ($donacionId <= 0) {
    json_error('Falta donacionId');
}

$mensaje = trim($_POST['mensaje'] ?? '') ?: null;
if ($mensaje !== null && mb_strlen($mensaje) > 300) {
    json_error('El mensaje es demasiado largo (máximo 300 caracteres)');
}

$stmt = $conn->prepare("SELECT UserId FROM Donacion WHERE DonacionId = ? AND Estado = 'A'");
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$donacion) {
    json_error('Publicación de donación no encontrada', 404);
}
$autorId = (int) $donacion['UserId'];
if ($autorId === $userId) {
    json_error('No podés interesarte en tu propia publicación');
}

$stmt = $conn->prepare('SELECT DonacionInteresId FROM DonacionInteres WHERE DonacionId = ? AND UserId = ?');
$stmt->bind_param('ii', $donacionId, $userId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya marcaste tu interés en esta publicación', 409);
}
$stmt->close();

$stmt = $conn->prepare('INSERT INTO DonacionInteres (DonacionId, UserId, Mensaje) VALUES (?, ?, ?)');
$stmt->bind_param('iis', $donacionId, $userId, $mensaje);
$stmt->execute();
$interesId = (int) $stmt->insert_id;
$stmt->close();

$stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$yo = $stmt->get_result()->fetch_assoc();
$stmt->close();
$nombreYo = !empty($yo['Username']) ? '@' . $yo['Username'] : ($yo['NombreCompleto'] ?? 'Alguien');

rh_notificar(
    $conn,
    [$autorId],
    'donacion_interes',
    'Nuevo interesado',
    "$nombreYo está interesado/a en tu publicación de donación",
    '/(app)/donaciones/' . $donacionId . '/interesados',
    ['actorUserId' => $userId]
);

json_success(['donacionInteresId' => $interesId], 'Interés registrado', 201);
