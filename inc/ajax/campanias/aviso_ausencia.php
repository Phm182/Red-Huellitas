<?php
/**
 * "No voy a poder ir": avisarle al equipo que organiza.
 *
 * Existe para el caso en que ya pasó el plazo de baja. Sin esto, quien sabe que
 * no va se queda sin forma de decirlo y el lugar se pierde igual, pero encima
 * sin que nadie se entere hasta el día de la campaña.
 *
 * Libera el lugar (y asciende al que espera) igual que una baja, pero se
 * registra distinto —Estado 'ausente'— para que el equipo pueda diferenciar a
 * quien avisó de quien simplemente no apareció.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania_inscripcion.php';

$userId = rh_require_auth($conn);

$inscripcionId = (int) ($_POST['campaniaInscripcionId'] ?? 0);
if ($inscripcionId <= 0) {
    json_error('Falta campaniaInscripcionId');
}

$nota = trim($_POST['nota'] ?? '');
if (mb_strlen($nota) > 255) {
    json_error('La nota es demasiado larga (máx 255 caracteres)');
}

$stmt = $conn->prepare(
    'SELECT i.*, c.UserId AS OrganizaUserId, c.Titulo
     FROM CampaniaInscripcion i
     JOIN Campania c ON c.CampaniaId = i.CampaniaId
     WHERE i.CampaniaInscripcionId = ?'
);
$stmt->bind_param('i', $inscripcionId);
$stmt->execute();
$ins = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$ins) {
    json_error('Inscripción no encontrada', 404);
}
if ((int) $ins['UserId'] !== $userId) {
    json_error('Esa inscripción no es tuya', 403);
}
if ($ins['Estado'] === 'cancelada' || $ins['Estado'] === 'ausente') {
    json_error('Ya avisaste que no vas a asistir', 409);
}

$eraConfirmada = $ins['Estado'] === 'confirmada';

$stmt = $conn->prepare(
    "UPDATE CampaniaInscripcion SET Estado = 'ausente', AvisoAusenciaEn = NOW(), NotaAusencia = ?
     WHERE CampaniaInscripcionId = ? AND Estado IN ('confirmada','lista_espera')"
);
$notaGuardar = $nota !== '' ? $nota : null;
$stmt->bind_param('si', $notaGuardar, $inscripcionId);
$stmt->execute();
$ok = $stmt->affected_rows > 0;
$stmt->close();

if (!$ok) {
    json_error('No se pudo registrar el aviso', 409);
}

$ascendido = $eraConfirmada
    ? rh_campania_ascender_siguiente($conn, (int) $ins['CampaniaId'])
    : null;

try {
    require_once __DIR__ . '/../../funciones/notificaciones.php';
    rh_notificar(
        $conn,
        [(int) $ins['OrganizaUserId']],
        'campania_ausencia',
        'Alguien avisó que no va a asistir',
        'En "' . $ins['Titulo'] . '"' . ($nota !== '' ? ': ' . $nota : '.'),
        '/(app)/campanias/' . $ins['CampaniaId'] . '/administrar',
        ['actorUserId' => $userId]
    );
} catch (Throwable $e) {
    // El aviso ya quedó registrado en la inscripción.
}

json_success(
    ['ascendidoUserId' => $ascendido],
    'Le avisamos al equipo que organiza. Gracias por avisar.'
);
