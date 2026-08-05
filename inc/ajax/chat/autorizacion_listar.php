<?php
/**
 * Bandeja del adulto responsable: las conversaciones de los menores a su cargo,
 * con quién es la otra persona, para decidir si las autoriza.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/menores.php';

$userId = rh_require_auth($conn);

$estadoFiltro = trim($_GET['estado'] ?? 'pendiente');
if (!in_array($estadoFiltro, ['pendiente', 'autorizada', 'bloqueada', 'todas'], true)) {
    $estadoFiltro = 'pendiente';
}

// El "otro" de la conversación es el participante que no es el menor. Se
// resuelve con un JOIN sobre ConversacionParticipante en vez de una segunda
// consulta por fila, que a 20 conversaciones serían 20 viajes a la base.
$sql =
    "SELECT ca.ConversacionId, ca.UserIdMenor, ca.Estado, ca.CreatedAt, ca.ResueltaEn,
            men.NombreCompleto AS MenorNombre, men.Username AS MenorUsuario, men.AvatarPath AS MenorAvatar,
            otr.UserId AS OtroUserId, otr.NombreCompleto AS OtroNombre,
            otr.Username AS OtroUsuario, otr.AvatarPath AS OtroAvatar,
            (SELECT COUNT(*) FROM Mensaje m WHERE m.ConversacionId = ca.ConversacionId) AS Mensajes
       FROM ConversacionAutorizacion ca
       JOIN Usuario men ON men.UserId = ca.UserIdMenor
       JOIN ConversacionParticipante cp
         ON cp.ConversacionId = ca.ConversacionId AND cp.UserId <> ca.UserIdMenor
       JOIN Usuario otr ON otr.UserId = cp.UserId
      WHERE ca.UserIdTutor = ?";

if ($estadoFiltro !== 'todas') {
    $sql .= ' AND ca.Estado = ?';
}
$sql .= ' ORDER BY ca.CreatedAt DESC LIMIT 100';

$stmt = $conn->prepare($sql);
if ($estadoFiltro !== 'todas') {
    $stmt->bind_param('is', $userId, $estadoFiltro);
} else {
    $stmt->bind_param('i', $userId);
}
$stmt->execute();
$res = $stmt->get_result();

$items = [];
while ($f = $res->fetch_assoc()) {
    $items[] = [
        'conversacionId' => (int) $f['ConversacionId'],
        'estado' => $f['Estado'],
        'creadaEn' => $f['CreatedAt'],
        'resueltaEn' => $f['ResueltaEn'],
        'mensajes' => (int) $f['Mensajes'],
        'menor' => [
            'userId' => (int) $f['UserIdMenor'],
            'nombre' => $f['MenorNombre'],
            'usuario' => $f['MenorUsuario'],
            'avatarPath' => $f['MenorAvatar'],
        ],
        'otro' => [
            'userId' => (int) $f['OtroUserId'],
            'nombre' => $f['OtroNombre'],
            'usuario' => $f['OtroUsuario'],
            'avatarPath' => $f['OtroAvatar'],
        ],
    ];
}
$stmt->close();

json_success(['items' => $items, 'estado' => $estadoFiltro]);
