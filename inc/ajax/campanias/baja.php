<?php
/**
 * Darse de baja de una campaña.
 *
 * Sirve tanto para que la persona se baje sola como para que quien organiza dé
 * de baja a alguien: es la misma operación y en los dos casos hay que ascender
 * al primero de la lista de espera. Tenerlo en un solo endpoint evita que una
 * de las dos ramas se olvide del ascenso, que es el bug clásico de esto.
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

$stmt = $conn->prepare(
    'SELECT i.*, c.UserId AS OrganizaUserId, c.Titulo, c.FechaDesde, c.BajaLimiteHoras
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

$esPropia = (int) $ins['UserId'] === $userId;
$organiza = (int) $ins['OrganizaUserId'] === $userId;
if (!$esPropia && !$organiza) {
    json_error('No tenés permiso sobre esta inscripción', 403);
}
if ($ins['Estado'] === 'cancelada') {
    json_error('Esa inscripción ya estaba dada de baja', 409);
}

// El límite de tiempo aplica sólo a quien se baja solo. Quien organiza tiene
// que poder sacar a alguien en cualquier momento — es su campaña.
if ($esPropia && !$organiza && !rh_campania_puede_darse_baja($conn, $ins)) {
    json_error(
        'Ya pasó el plazo para darte de baja. Podés avisar que no vas a asistir.',
        409
    );
}

$eraConfirmada = $ins['Estado'] === 'confirmada';

$stmt = $conn->prepare(
    "UPDATE CampaniaInscripcion SET Estado = 'cancelada', CanceladaEn = NOW()
     WHERE CampaniaInscripcionId = ? AND Estado <> 'cancelada'"
);
$stmt->bind_param('i', $inscripcionId);
$stmt->execute();
$bajo = $stmt->affected_rows > 0;
$stmt->close();

if (!$bajo) {
    json_error('Esa inscripción ya estaba dada de baja', 409);
}

// Sólo se libera lugar si ocupaba uno. Bajar a alguien que estaba esperando no
// habilita a nadie.
$ascendido = null;
if ($eraConfirmada) {
    $ascendido = rh_campania_ascender_siguiente($conn, (int) $ins['CampaniaId']);
}

// Si lo dio de baja quien organiza, la persona tiene que enterarse.
if (!$esPropia) {
    try {
        require_once __DIR__ . '/../../funciones/notificaciones.php';
        rh_notificar(
            $conn,
            [(int) $ins['UserId']],
            'campania_baja',
            'Te dieron de baja de una campaña',
            'En "' . $ins['Titulo'] . '". Consultá con quien organiza.',
            '/(app)/campanias/' . $ins['CampaniaId']
        );
    } catch (Throwable $e) {
        // La baja ya está hecha.
    }
}

json_success(
    ['ascendidoUserId' => $ascendido],
    $ascendido !== null
        ? 'Baja registrada. Subió la primera persona de la lista de espera.'
        : 'Baja registrada'
);
