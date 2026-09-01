<?php
/**
 * Interesados en una donación propia. Molde recortado de
 * adopcion/postulaciones_recibidas.php, sin el bloque de preguntas/respuestas
 * (acá no hay cuestionario, sólo un mensaje opcional).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$donacionId = (int) ($_GET['donacionId'] ?? 0);
if ($donacionId <= 0) {
    json_error('Falta donacionId');
}

$stmt = $conn->prepare('SELECT UserId FROM Donacion WHERE DonacionId = ?');
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$donacion) {
    json_error('Publicación de donación no encontrada', 404);
}
if ((int) $donacion['UserId'] !== $userId) {
    json_error('No tenés permiso para ver estos interesados', 403);
}

$stmt = $conn->prepare(
    'SELECT DonacionInteres.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM DonacionInteres
     JOIN Usuario ON Usuario.UserId = DonacionInteres.UserId
     WHERE DonacionInteres.DonacionId = ?
     ORDER BY DonacionInteres.CreatedAt DESC'
);
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$result = $stmt->get_result();

$interesados = [];
while ($row = $result->fetch_assoc()) {
    $interesados[] = [
        'donacionInteresId' => (int) $row['DonacionInteresId'],
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
