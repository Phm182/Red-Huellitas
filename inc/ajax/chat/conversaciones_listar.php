<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/chat.php';

$userId = rh_require_auth($conn);

// 'activa' = las charlas; 'solicitud' = la bandeja de desconocidos.
$estado = ($_GET['estado'] ?? 'activa') === 'solicitud' ? 'solicitud' : 'activa';

$stmt = $conn->prepare(
    "SELECT
        c.ConversacionId, c.UltimoMensajeEn,
        cp.UltimaLecturaMensajeId,
        u.UserId, u.Username, u.NombreCompleto, u.AvatarPath, u.MensajePersonal,
        (SELECT m.Texto FROM Mensaje m WHERE m.ConversacionId = c.ConversacionId ORDER BY m.MensajeId DESC LIMIT 1) AS UltimoTexto,
        (SELECT m.Tipo FROM Mensaje m WHERE m.ConversacionId = c.ConversacionId ORDER BY m.MensajeId DESC LIMIT 1) AS UltimoTipo,
        (SELECT COUNT(*) FROM Mensaje m
           WHERE m.ConversacionId = c.ConversacionId
             AND m.UserIdEmisor <> ?
             AND m.MensajeId > COALESCE(cp.UltimaLecturaMensajeId, 0)) AS NoLeidos
     FROM ConversacionParticipante cp
     JOIN Conversacion c ON c.ConversacionId = cp.ConversacionId
     JOIN ConversacionParticipante otro ON otro.ConversacionId = c.ConversacionId AND otro.UserId <> cp.UserId
     JOIN Usuario u ON u.UserId = otro.UserId
     WHERE cp.UserId = ? AND cp.Estado = ? AND u.Estado = 'A'
     ORDER BY c.UltimoMensajeEn DESC, c.ConversacionId DESC
     LIMIT 50"
);
$stmt->bind_param('iis', $userId, $userId, $estado);
$stmt->execute();
$res = $stmt->get_result();

$conversaciones = [];
while ($fila = $res->fetch_assoc()) {
    $conversaciones[] = [
        'conversacionId' => (int) $fila['ConversacionId'],
        'ultimoMensajeEn' => $fila['UltimoMensajeEn'],
        'ultimoTexto' => $fila['UltimoTexto'],
        'ultimoTipo' => $fila['UltimoTipo'],
        'noLeidos' => (int) $fila['NoLeidos'],
        'otro' => [
            'userId' => (int) $fila['UserId'],
            'username' => $fila['Username'],
            'nombreCompleto' => $fila['NombreCompleto'],
            'avatarPath' => $fila['AvatarPath'],
            'avatarBust' => rh_avatar_bust($fila['AvatarPath'] ?? null),
            'mensajePersonal' => $fila['MensajePersonal'],
        ],
    ];
}
$stmt->close();

json_success(['conversaciones' => $conversaciones]);
