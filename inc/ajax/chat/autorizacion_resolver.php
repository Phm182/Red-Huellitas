<?php
/**
 * El adulto responsable autoriza o bloquea una conversación de su menor.
 *
 * Bloquear no borra nada: el historial queda, pero `rh_chat_permitido()` deja
 * de dejar mandar. Se puede volver a autorizar después sin perder los mensajes.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/menores.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$conversacionId = (int) ($_POST['conversacionId'] ?? 0);
$accion = trim($_POST['accion'] ?? '');

if ($conversacionId <= 0) {
    json_error('Falta conversacionId');
}
if (!in_array($accion, ['autorizar', 'bloquear'], true)) {
    json_error('Acción inválida');
}

// Sólo el tutor asignado a ESA conversación puede resolverla. Con esto no
// alcanza con ser tutor de alguien: tiene que ser el tutor de este menor.
$stmt = $conn->prepare(
    'SELECT ca.UserIdMenor, ca.Estado
       FROM ConversacionAutorizacion ca
      WHERE ca.ConversacionId = ? AND ca.UserIdTutor = ?'
);
$stmt->bind_param('ii', $conversacionId, $userId);
$stmt->execute();
$fila = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$fila) {
    json_error('No sos el adulto responsable de esta conversación', 403);
}

$menorId = (int) $fila['UserIdMenor'];
$nuevo = $accion === 'autorizar' ? 'autorizada' : 'bloqueada';

if ($fila['Estado'] === $nuevo) {
    json_success(['conversacionId' => $conversacionId, 'estado' => $nuevo], 'Sin cambios');
}

$stmt = $conn->prepare(
    'UPDATE ConversacionAutorizacion SET Estado = ?, ResueltaEn = NOW()
      WHERE ConversacionId = ? AND UserIdTutor = ?'
);
$stmt->bind_param('sii', $nuevo, $conversacionId, $userId);
$stmt->execute();
$stmt->close();

// Se le avisa al menor: si no, ve el chat trabado y no entiende por qué.
rh_notificar(
    $conn,
    [$menorId],
    'chat_autorizacion',
    'Chat supervisado',
    $accion === 'autorizar'
        ? 'Tu adulto responsable habilitó esta conversación'
        : 'Tu adulto responsable bloqueó esta conversación',
    '/(app)/chat',
    ['actorUserId' => $userId]
);

json_success(
    ['conversacionId' => $conversacionId, 'estado' => $nuevo],
    $accion === 'autorizar' ? 'Conversación autorizada' : 'Conversación bloqueada'
);
