<?php
/**
 * Corta un vínculo de tutela ya aceptado.
 *
 * Lo puede hacer cualquiera de los dos: el tutor porque ya no quiere la
 * responsabilidad, y el menor porque creció o se equivocó de persona.
 *
 * Al revocar, el menor queda otra vez sin tutor y `rh_chat_permitido()` le
 * corta el chat solo — no hace falta tocar las conversaciones acá.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$tutelaId = (int) ($_POST['tutelaId'] ?? 0);
if ($tutelaId <= 0) {
    json_error('Falta tutelaId');
}

$stmt = $conn->prepare('SELECT * FROM Tutela WHERE TutelaId = ?');
$stmt->bind_param('i', $tutelaId);
$stmt->execute();
$t = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$t) {
    json_error('El vínculo no existe', 404);
}

$menorId = (int) $t['UserIdMenor'];
$tutorId = (int) $t['UserIdTutor'];

if ($userId !== $menorId && $userId !== $tutorId) {
    json_error('No participás de este vínculo', 403);
}
if ($t['Estado'] !== 'aceptada') {
    json_error('Ese vínculo no está activo', 409);
}

$stmt = $conn->prepare("UPDATE Tutela SET Estado = 'revocada', ResueltaEn = NOW() WHERE TutelaId = ?");
$stmt->bind_param('i', $tutelaId);
$stmt->execute();
$stmt->close();

// Las autorizaciones que había dado ese tutor vuelven a pendiente: fueron
// decisiones suyas, y si se va no siguen valiendo para el que venga después.
$stmt = $conn->prepare(
    "UPDATE ConversacionAutorizacion
        SET Estado = 'pendiente', UserIdTutor = NULL, ResueltaEn = NULL
      WHERE UserIdMenor = ? AND UserIdTutor = ?"
);
$stmt->bind_param('ii', $menorId, $tutorId);
$stmt->execute();
$stmt->close();

$otro = $userId === $menorId ? $tutorId : $menorId;
rh_notificar(
    $conn,
    [$otro],
    'tutela_revocada',
    'Vínculo familiar',
    'El vínculo familiar se dio de baja',
    '/(app)/configuracion',
    ['actorUserId' => $userId]
);

json_success(['tutelaId' => $tutelaId, 'estado' => 'revocada'], 'Vínculo dado de baja');
