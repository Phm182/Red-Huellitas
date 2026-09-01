<?php
/**
 * Interesados en un tránsito propio. Molde recortado de
 * adopcion/postulaciones_recibidas.php, sin el bloque de preguntas/respuestas
 * (acá no hay cuestionario, sólo un mensaje opcional).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$transitoId = (int) ($_GET['transitoId'] ?? 0);
if ($transitoId <= 0) {
    json_error('Falta transitoId');
}

$stmt = $conn->prepare('SELECT UserId FROM Transito WHERE TransitoId = ?');
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$transito) {
    json_error('Publicación de tránsito no encontrada', 404);
}
if ((int) $transito['UserId'] !== $userId) {
    json_error('No tenés permiso para ver estos interesados', 403);
}

$stmt = $conn->prepare(
    'SELECT TransitoInteres.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM TransitoInteres
     JOIN Usuario ON Usuario.UserId = TransitoInteres.UserId
     WHERE TransitoInteres.TransitoId = ?
     ORDER BY TransitoInteres.CreatedAt DESC'
);
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$result = $stmt->get_result();

$interesados = [];
while ($row = $result->fetch_assoc()) {
    $interesados[] = [
        'transitoInteresId' => (int) $row['TransitoInteresId'],
        'usuario' => rh_usuario_resumen([
            'UserId' => $row['UserId'],
            'Username' => $row['Username'],
            'NombreCompleto' => $row['NombreCompleto'],
            'AvatarPath' => $row['AvatarPath'],
        ]),
        'mensaje' => $row['Mensaje'],
        'createdAt' => $row['CreatedAt'],
    ];
}
$stmt->close();

json_success(['interesados' => $interesados]);
