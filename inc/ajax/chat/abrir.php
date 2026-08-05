<?php
/**
 * Abre (o crea) la conversación con un usuario y devuelve sus mensajes.
 *
 * También lo usa el polling: con `desdeMensajeId` devuelve sólo lo nuevo, que
 * es lo que hace que consultar cada 4 segundos sea barato.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';
require_once __DIR__ . '/../../funciones/menores.php';

$userId = rh_require_auth($conn);

$conversacionId = isset($_GET['conversacionId']) ? (int) $_GET['conversacionId'] : 0;
$otroUserId = isset($_GET['userId']) ? (int) $_GET['userId'] : 0;
$desde = isset($_GET['desdeMensajeId']) ? (int) $_GET['desdeMensajeId'] : 0;

if ($conversacionId <= 0) {
    if ($otroUserId <= 0) {
        json_error('Falta conversacionId o userId');
    }
    if ($otroUserId === $userId) {
        json_error('No podés chatear con vos mismo');
    }
    $stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $otroUserId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('El usuario no existe', 404);
    }
    $stmt->close();

    // Protección de menores ANTES de crear nada: si el vínculo no está
    // permitido, no queremos ni siquiera dejar la conversación creada.
    $permiso = rh_chat_permitido($conn, $userId, $otroUserId);
    if (!$permiso['ok'] && $permiso['motivo'] !== 'esperando_autorizacion') {
        json_error(rh_chat_motivo_texto($permiso['motivo']), 403);
    }

    $conversacionId = rh_chat_obtener_o_crear($conn, $userId, $otroUserId);
}

$estado = rh_chat_estado_participante($conn, $conversacionId, $userId);
if ($estado === null) {
    json_error('No participás de esta conversación', 403);
}

// Con la conversación ya identificada se revalida incluyendo la autorización
// del tutor, y se deja la fila pendiente para que el adulto la vea.
$otroDatos = rh_chat_otro_participante($conn, $conversacionId, $userId);
$permisoChat = ['ok' => true, 'motivo' => ''];
if ($otroDatos) {
    $otroId = (int) $otroDatos['userId'];
    foreach ([$userId, $otroId] as $uid) {
        if (rh_es_menor($conn, $uid) && rh_tutor_de($conn, $uid) !== null) {
            rh_autorizacion_asegurar($conn, $conversacionId, $uid);
        }
    }
    $permisoChat = rh_chat_permitido($conn, $userId, $otroId, $conversacionId);
}

// Sin autorización del tutor no se devuelve el contenido, sólo el motivo. Dejar
// leer los mensajes "mientras espera" vaciaría de sentido el permiso: el chat
// ya habría pasado igual.
if (!$permisoChat['ok']) {
    json_success([
        'conversacionId' => $conversacionId,
        'estado' => $estado,
        'otro' => $otroDatos,
        'mensajes' => [],
        'bloqueo' => [
            'motivo' => $permisoChat['motivo'],
            'texto' => rh_chat_motivo_texto($permisoChat['motivo']),
        ],
    ]);
}

$sql = 'SELECT * FROM Mensaje WHERE ConversacionId = ?';
if ($desde > 0) {
    $sql .= ' AND MensajeId > ?';
}
$sql .= ' ORDER BY MensajeId ASC LIMIT 200';

$stmt = $conn->prepare($sql);
if ($desde > 0) {
    $stmt->bind_param('ii', $conversacionId, $desde);
} else {
    $stmt->bind_param('i', $conversacionId);
}
$stmt->execute();
$res = $stmt->get_result();
$mensajes = [];
while ($fila = $res->fetch_assoc()) {
    $mensajes[] = rh_mensaje_serializar($fila);
}
$stmt->close();

json_success([
    'conversacionId' => $conversacionId,
    'estado' => $estado,
    'otro' => $otroDatos,
    'mensajes' => $mensajes,
    'bloqueo' => null,
]);
