<?php
/**
 * Invita usuarios a sumarse a una cadena. Les llega un push con el tema.
 *
 * La invitación no da permisos: cualquiera puede sumarse a cualquier cadena
 * activa. Sirve para avisar, no para restringir — una cadena cerrada iría en
 * contra de la idea de que la comunidad la continúe.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/cadenas.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$cadenaId = (int) ($_POST['cadenaId'] ?? 0);
$idsRaw = $_POST['userIds'] ?? '';

if ($cadenaId <= 0) {
    json_error('Falta cadenaId');
}

$ids = array_values(array_unique(array_filter(
    array_map('intval', explode(',', (string) $idsRaw)),
    static fn (int $id) => $id > 0 && $id !== $userId
)));
if ($ids === []) {
    json_error('Elegí al menos una persona para invitar');
}

$stmt = $conn->prepare("SELECT Tema FROM Cadena WHERE CadenaId = ? AND Estado = 'A'");
$stmt->bind_param('i', $cadenaId);
$stmt->execute();
$cadena = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$cadena) {
    json_error('Cadena no encontrada', 404);
}

$stmt = $conn->prepare(
    'INSERT INTO CadenaInvitacion (CadenaId, UserId, InvitadoPorUserId) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE InvitadoPorUserId = VALUES(InvitadoPorUserId)'
);
foreach ($ids as $destinoId) {
    $stmt->bind_param('iii', $cadenaId, $destinoId, $userId);
    $stmt->execute();
}
$stmt->close();

// Una notificación por invitado: rh_notificar guarda las filas y agrupa el
// push solo, así que ya no hace falta juntar tokens a mano acá.
rh_notificar(
    $conn,
    $ids,
    'cadena_invitacion',
    'Te invitaron a una cadena 🔗',
    sprintf('Sumate a "%s" con tu historia.', $cadena['Tema']),
    '/(app)/cadenas/' . $cadenaId,
    ['actorUserId' => $userId]
);

json_success(['invitados' => count($ids)], 'Invitaciones enviadas');
