<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';

$userId = rh_require_auth($conn);

$conversacionId = (int) ($_POST['conversacionId'] ?? 0);
if ($conversacionId <= 0) {
    json_error('Falta conversacionId');
}
if (rh_chat_estado_participante($conn, $conversacionId, $userId) === null) {
    json_error('No participás de esta conversación', 403);
}

// Se marca hasta el último mensaje que existe, no hasta uno que mande la app:
// así no se puede "leer" algo que todavía no llegó.
$stmt = $conn->prepare(
    'UPDATE ConversacionParticipante cp
     SET cp.UltimaLecturaMensajeId = (
        SELECT MAX(m.MensajeId) FROM Mensaje m WHERE m.ConversacionId = cp.ConversacionId
     )
     WHERE cp.ConversacionId = ? AND cp.UserId = ?'
);
$stmt->bind_param('ii', $conversacionId, $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Listo');
