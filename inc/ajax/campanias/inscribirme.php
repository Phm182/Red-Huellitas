<?php
/**
 * Inscripción a una campaña — solo requiere estar autenticado (a diferencia
 * de Adopción, acá no hay intercambio de datos personales sensibles con un
 * desconocido, es un RSVP simple a un evento público).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_POST['campaniaId'] ?? 0);
if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}

$stmt = $conn->prepare("SELECT * FROM Campania WHERE CampaniaId = ? AND Estado = 'A'");
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania) {
    json_error('Campaña no encontrada', 404);
}
if ((int) $campania['RequiereInscripcion'] !== 1) {
    json_error('Esta campaña no requiere inscripción previa');
}

$stmt = $conn->prepare('SELECT CampaniaInscripcionId FROM CampaniaInscripcion WHERE CampaniaId = ? AND UserId = ?');
$stmt->bind_param('ii', $campaniaId, $userId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya estás inscripto en esta campaña', 409);
}
$stmt->close();

if ($campania['CupoMaximo'] !== null) {
    $totalActual = rh_campania_total_inscriptos($conn, $campaniaId);
    if ($totalActual >= (int) $campania['CupoMaximo']) {
        json_error('Esta campaña ya alcanzó el cupo máximo de inscriptos', 409);
    }
}

$stmt = $conn->prepare('INSERT INTO CampaniaInscripcion (CampaniaId, UserId) VALUES (?, ?)');
$stmt->bind_param('ii', $campaniaId, $userId);
$stmt->execute();
$inscripcionId = (int) $stmt->insert_id;
$stmt->close();

json_success(['campaniaInscripcionId' => $inscripcionId], 'Inscripción registrada', 201);
