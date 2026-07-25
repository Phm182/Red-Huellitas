<?php
/**
 * Postulaciones recibidas sobre un listado propio, con las respuestas
 * completas del adoptante. Solo el dueño del listado puede verlas.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$userId = rh_require_auth($conn);

$adopcionId = (int) ($_GET['adopcionId'] ?? 0);
if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}

$stmt = $conn->prepare('SELECT UserId FROM Adopcion WHERE AdopcionId = ?');
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$adopcion) {
    json_error('Publicación de adopción no encontrada', 404);
}
if ((int) $adopcion['UserId'] !== $userId) {
    json_error('No tenés permiso para ver estas postulaciones', 403);
}

$stmt = $conn->prepare(
    'SELECT AdopcionPostulacion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM AdopcionPostulacion
     JOIN Usuario ON Usuario.UserId = AdopcionPostulacion.UserId
     WHERE AdopcionPostulacion.AdopcionId = ?
     ORDER BY AdopcionPostulacion.CreatedAt DESC'
);
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$result = $stmt->get_result();

$postulaciones = [];
while ($row = $result->fetch_assoc()) {
    $postulacionId = (int) $row['AdopcionPostulacionId'];
    $postulaciones[] = [
        'adopcionPostulacionId' => $postulacionId,
        'adoptante' => rh_usuario_resumen([
            'UserId' => $row['UserId'],
            'Username' => $row['Username'],
            'NombreCompleto' => $row['NombreCompleto'],
            'AvatarPath' => $row['AvatarPath'],
        ]),
        'estadoRevision' => $row['EstadoRevision'],
        'createdAt' => $row['CreatedAt'],
        'respuestas' => rh_adopcion_respuestas_postulacion($conn, $postulacionId),
    ];
}
$stmt->close();

json_success(['postulaciones' => $postulaciones]);
