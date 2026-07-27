<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$conversacionId = (int) ($_POST['conversacionId'] ?? 0);
$texto = trim($_POST['texto'] ?? '');
$tipo = ($_POST['tipo'] ?? 'texto') === 'zumbido' ? 'zumbido' : 'texto';

if ($conversacionId <= 0) {
    json_error('Falta conversacionId');
}
if ($tipo === 'texto' && $texto === '') {
    json_error('El mensaje está vacío');
}
if (mb_strlen($texto) > 1000) {
    json_error('El mensaje es demasiado largo');
}
// El zumbido no lleva texto propio: lo que se guarda es la marca, y la app
// dibuja el sacudón. Guardar algo permite que quede en el historial.
if ($tipo === 'zumbido') {
    $texto = '¡Zumbido!';
}

$estado = rh_chat_estado_participante($conn, $conversacionId, $userId);
if ($estado === null) {
    json_error('No participás de esta conversación', 403);
}

$stmt = $conn->prepare(
    'INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo) VALUES (?, ?, ?, ?)'
);
$stmt->bind_param('iiss', $conversacionId, $userId, $texto, $tipo);
$stmt->execute();
$mensajeId = (int) $stmt->insert_id;
$stmt->close();

$conn->query('UPDATE Conversacion SET UltimoMensajeEn = NOW() WHERE ConversacionId = ' . $conversacionId);

// El que escribe da por leído lo suyo: si no, su propio mensaje le contaría
// como no leído al recargar.
$stmt = $conn->prepare(
    'UPDATE ConversacionParticipante SET UltimaLecturaMensajeId = ? WHERE ConversacionId = ? AND UserId = ?'
);
$stmt->bind_param('iii', $mensajeId, $conversacionId, $userId);
$stmt->execute();
$stmt->close();

$otro = rh_chat_otro_participante($conn, $conversacionId, $userId);
if ($otro) {
    $estadoOtro = rh_chat_estado_participante($conn, $conversacionId, (int) $otro['userId']);
    // A una solicitud sin aceptar no se le manda push: sería exactamente el
    // spam que la bandeja intenta evitar. Igual queda el mensaje esperando.
    if ($estadoOtro === 'activa') {
        $stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $yo = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $nombreYo = !empty($yo['Username']) ? '@' . $yo['Username'] : $yo['NombreCompleto'];

        // Push sí, fila de Notificacion no: el historial del chat es la
        // conversación misma, y guardarlo además como notificación llenaría la
        // campanita de ruido y contaría el mismo mensaje en dos badges.
        $stmt = $conn->prepare(
            "SELECT ExpoPushToken FROM Usuario WHERE UserId = ? AND ExpoPushToken IS NOT NULL AND ExpoPushToken <> ''"
        );
        $destinoId = (int) $otro['userId'];
        $stmt->bind_param('i', $destinoId);
        $stmt->execute();
        $tok = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($tok) {
            rh_enviar_push(
                [$tok['ExpoPushToken']],
                $nombreYo,
                $tipo === 'zumbido' ? 'Te mandó un zumbido' : $texto,
                ['ruta' => '/(app)/chat/' . $conversacionId]
            );
        }
    }
}

json_success([
    'mensajeId' => $mensajeId,
    'conversacionId' => $conversacionId,
    'tipo' => $tipo,
], 'Enviado', 201);
