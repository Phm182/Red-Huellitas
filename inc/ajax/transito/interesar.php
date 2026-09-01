<?php
/**
 * "Me interesa" en una publicación de tránsito -- levantar la mano, sin el
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

$transitoId = (int) ($_POST['transitoId'] ?? 0);
if ($transitoId <= 0) {
    json_error('Falta transitoId');
}

$mensaje = trim($_POST['mensaje'] ?? '') ?: null;
if ($mensaje !== null && mb_strlen($mensaje) > 300) {
    json_error('El mensaje es demasiado largo (máximo 300 caracteres)');
}

$stmt = $conn->prepare("SELECT UserId FROM Transito WHERE TransitoId = ? AND Estado = 'A'");
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$transito) {
    json_error('Publicación de tránsito no encontrada', 404);
}
$autorId = (int) $transito['UserId'];
if ($autorId === $userId) {
    json_error('No podés interesarte en tu propia publicación');
}

$stmt = $conn->prepare('SELECT TransitoInteresId FROM TransitoInteres WHERE TransitoId = ? AND UserId = ?');
$stmt->bind_param('ii', $transitoId, $userId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya marcaste tu interés en esta publicación', 409);
}
$stmt->close();

$stmt = $conn->prepare('INSERT INTO TransitoInteres (TransitoId, UserId, Mensaje) VALUES (?, ?, ?)');
$stmt->bind_param('iis', $transitoId, $userId, $mensaje);
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
    'transito_interes',
    'Nuevo interesado',
    "$nombreYo está interesado/a en tu publicación de tránsito",
    '/(app)/transito/' . $transitoId . '/interesados',
    ['actorUserId' => $userId]
);

json_success(['transitoInteresId' => $interesId], 'Interés registrado', 201);
