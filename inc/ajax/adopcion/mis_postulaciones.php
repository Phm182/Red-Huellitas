<?php
/**
 * Postulaciones enviadas por el usuario logueado (como adoptante), con un
 * resumen del listado al que se postuló.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    'SELECT AdopcionPostulacion.AdopcionPostulacionId, AdopcionPostulacion.EstadoRevision, AdopcionPostulacion.CreatedAt,
            Adopcion.AdopcionId, Adopcion.Nombre, Adopcion.Especie, Adopcion.EstadoAdopcion
     FROM AdopcionPostulacion
     JOIN Adopcion ON Adopcion.AdopcionId = AdopcionPostulacion.AdopcionId
     WHERE AdopcionPostulacion.UserId = ?
     ORDER BY AdopcionPostulacion.CreatedAt DESC'
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$postulaciones = [];
while ($row = $result->fetch_assoc()) {
    $adopcionId = (int) $row['AdopcionId'];
    $postulaciones[] = [
        'adopcionPostulacionId' => (int) $row['AdopcionPostulacionId'],
        'estadoRevision' => $row['EstadoRevision'],
        'createdAt' => $row['CreatedAt'],
        'adopcionId' => $adopcionId,
        'nombre' => $row['Nombre'],
        'especie' => $row['Especie'],
        'estadoAdopcion' => $row['EstadoAdopcion'],
        'fotos' => rh_adopcion_fotos($conn, $adopcionId),
    ];
}
$stmt->close();

json_success(['postulaciones' => $postulaciones]);
