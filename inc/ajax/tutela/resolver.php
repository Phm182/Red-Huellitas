<?php
/**
 * Acepta o rechaza una solicitud de tutela.
 *
 * Sólo puede resolverla quien NO la inició: si el menor la pidió, confirma el
 * tutor, y al revés. Sin esa regla cualquiera se auto-asignaría un tutor
 * inexistente y se destrabaría el chat solo.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/menores.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$tutelaId = (int) ($_POST['tutelaId'] ?? 0);
$accion = trim($_POST['accion'] ?? '');

if ($tutelaId <= 0) {
    json_error('Falta tutelaId');
}
if (!in_array($accion, ['aceptar', 'rechazar'], true)) {
    json_error('Acción inválida');
}

$stmt = $conn->prepare('SELECT * FROM Tutela WHERE TutelaId = ?');
$stmt->bind_param('i', $tutelaId);
$stmt->execute();
$t = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$t) {
    json_error('La solicitud no existe', 404);
}
if ($t['Estado'] !== 'pendiente') {
    json_error('Esa solicitud ya fue resuelta', 409);
}

$menorId = (int) $t['UserIdMenor'];
$tutorId = (int) $t['UserIdTutor'];

// Quien confirma es el lado opuesto al que inició.
$debeConfirmar = $t['IniciadaPor'] === 'menor' ? $tutorId : $menorId;
if ($userId !== $debeConfirmar) {
    json_error('No sos quien tiene que responder esta solicitud', 403);
}

$nuevo = $accion === 'aceptar' ? 'aceptada' : 'rechazada';
$stmt = $conn->prepare('UPDATE Tutela SET Estado = ?, ResueltaEn = NOW() WHERE TutelaId = ?');
$stmt->bind_param('si', $nuevo, $tutelaId);
$stmt->execute();
$stmt->close();

if ($accion === 'aceptar') {
    // Al aceptar, las conversaciones que el menor ya tenía abiertas pasan a
    // necesitar revisión: se les asigna este tutor y quedan pendientes. Si no,
    // los chats previos al vínculo se quedarían para siempre sin supervisar.
    $stmt = $conn->prepare(
        'INSERT IGNORE INTO ConversacionAutorizacion (ConversacionId, UserIdMenor, UserIdTutor)
         SELECT cp.ConversacionId, ?, ? FROM ConversacionParticipante cp WHERE cp.UserId = ?'
    );
    $stmt->bind_param('iii', $menorId, $tutorId, $menorId);
    $stmt->execute();
    $stmt->close();

    // Las que ya existían sin tutor asignado quedan a nombre de este.
    $stmt = $conn->prepare(
        'UPDATE ConversacionAutorizacion SET UserIdTutor = ? WHERE UserIdMenor = ? AND UserIdTutor IS NULL'
    );
    $stmt->bind_param('ii', $tutorId, $menorId);
    $stmt->execute();
    $stmt->close();
}

$otro = $userId === $menorId ? $tutorId : $menorId;
rh_notificar(
    $conn,
    [$otro],
    'tutela_resuelta',
    'Vínculo familiar',
    $accion === 'aceptar' ? 'El vínculo quedó activo' : 'La solicitud fue rechazada',
    '/(app)/configuracion',
    ['actorUserId' => $userId]
);

json_success(['tutelaId' => $tutelaId, 'estado' => $nuevo], $accion === 'aceptar' ? 'Vínculo aceptado' : 'Solicitud rechazada');
