<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';

$userId = rh_require_auth($conn);

$conversacionId = (int) ($_POST['conversacionId'] ?? 0);
$accion = trim($_POST['accion'] ?? '');

if ($conversacionId <= 0) {
    json_error('Falta conversacionId');
}
if (!in_array($accion, ['aceptar', 'rechazar'], true)) {
    json_error('Acción inválida');
}

$estado = rh_chat_estado_participante($conn, $conversacionId, $userId);
if ($estado !== 'solicitud') {
    json_error('Esta conversación no es una solicitud', 404);
}

if ($accion === 'aceptar') {
    $stmt = $conn->prepare(
        "UPDATE ConversacionParticipante SET Estado = 'activa' WHERE ConversacionId = ? AND UserId = ?"
    );
    $stmt->bind_param('ii', $conversacionId, $userId);
    $stmt->execute();
    $stmt->close();
    json_success(['estado' => 'activa'], 'Conversación aceptada');
}

// Rechazar borra la conversación entera: dejarla archivada guardaría para
// siempre el mensaje de alguien a quien no quisiste ni contestarle.
$stmt = $conn->prepare('DELETE FROM Conversacion WHERE ConversacionId = ?');
$stmt->bind_param('i', $conversacionId);
$stmt->execute();
$stmt->close();

json_success(['estado' => 'rechazada'], 'Solicitud rechazada');
