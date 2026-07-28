<?php
/**
 * "Vi a este animal": avisarle al dueño de un reporte de perdido.
 *
 * Hasta ahora, entrar a un reporte y reconocer al animal no tenía a dónde ir:
 * la única acción disponible era denunciar la publicación, que es justo lo
 * contrario de lo que uno quiere hacer. Este endpoint cierra ese hueco.
 *
 * Hace dos cosas de una: le manda la notificación al dueño y abre la
 * conversación entre los dos. Separarlo en "avisar" y después "escribir" haría
 * que el que vio al animal tenga que buscar al dueño por su cuenta, y en un
 * caso donde importan los minutos eso se pierde.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$perdidoId = (int) ($_POST['perdidoId'] ?? 0);
if ($perdidoId <= 0) {
    json_error('Falta perdidoId');
}

$nota = trim($_POST['nota'] ?? '');
if (mb_strlen($nota) > 500) {
    json_error('La nota es demasiado larga (máx 500 caracteres)');
}

$stmt = $conn->prepare(
    "SELECT UserId, Nombre, Tipo, EstadoPerdido FROM Perdido WHERE PerdidoId = ? AND Estado = 'A'"
);
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$perdido = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$perdido) {
    json_error('Reporte no encontrado', 404);
}

$duenoId = (int) $perdido['UserId'];
if ($duenoId === $userId) {
    json_error('Es tu propio reporte', 400);
}
if ($perdido['EstadoPerdido'] !== 'activo') {
    json_error('Este reporte ya está cerrado', 409);
}

// La conversación primero: si el chat falla, no queremos haber notificado
// "escribile al que lo vio" sin que haya dónde escribir.
$conversacionId = rh_chat_obtener_o_crear($conn, $userId, $duenoId);

if ($nota !== '') {
    $stmt = $conn->prepare(
        "INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo) VALUES (?, ?, ?, 'texto')"
    );
    $stmt->bind_param('iis', $conversacionId, $userId, $nota);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare('UPDATE Conversacion SET UltimoMensajeEn = NOW() WHERE ConversacionId = ?');
    $stmt->bind_param('i', $conversacionId);
    $stmt->execute();
    $stmt->close();
}

$nombre = $perdido['Nombre'] ?: 'la mascota';
try {
    rh_notificar(
        $conn,
        [$duenoId],
        'perdido_avistamiento',
        '👀 Alguien vio a ' . $nombre,
        $nota !== '' ? $nota : 'Tocá para hablar con quien lo vio.',
        '/(app)/chat/' . $conversacionId,
        ['actorUserId' => $userId]
    );
} catch (Throwable $e) {
    // El aviso ya quedó como mensaje en el chat; la notificación es el extra.
}

json_success(
    ['conversacionId' => $conversacionId],
    'Le avisamos a la persona que publicó el reporte'
);
