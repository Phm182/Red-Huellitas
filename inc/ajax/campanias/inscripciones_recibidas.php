<?php
/**
 * Inscriptos a una campaña propia (owner-only). A diferencia de Adopción,
 * acá no hay preguntas dinámicas — es una lista simple de quién se anotó.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_GET['campaniaId'] ?? 0);
if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}

$stmt = $conn->prepare('SELECT UserId FROM Campania WHERE CampaniaId = ?');
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania) {
    json_error('Campaña no encontrada', 404);
}
if ((int) $campania['UserId'] !== $userId) {
    json_error('No tenés permiso para ver estas inscripciones', 403);
}

$stmt = $conn->prepare(
    'SELECT CampaniaInscripcion.CampaniaInscripcionId, CampaniaInscripcion.CreatedAt,
            Usuario.UserId, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM CampaniaInscripcion
     JOIN Usuario ON Usuario.UserId = CampaniaInscripcion.UserId
     WHERE CampaniaInscripcion.CampaniaId = ?
     ORDER BY CampaniaInscripcion.CreatedAt ASC'
);
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$result = $stmt->get_result();

$inscriptos = [];
while ($row = $result->fetch_assoc()) {
    $inscriptos[] = [
        'campaniaInscripcionId' => (int) $row['CampaniaInscripcionId'],
        'createdAt' => $row['CreatedAt'],
        'usuario' => rh_usuario_resumen($row),
    ];
}
$stmt->close();

json_success(['inscriptos' => $inscriptos]);
