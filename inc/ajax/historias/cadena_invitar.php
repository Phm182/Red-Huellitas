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

// Push en un solo lote a los que tengan token (rh_enviar_push ya agrupa de a
// 100 por llamada).
$placeholders = implode(',', array_fill(0, count($ids), '?'));
$stmt = $conn->prepare(
    "SELECT ExpoPushToken FROM Usuario
     WHERE UserId IN ($placeholders) AND ExpoPushToken IS NOT NULL AND Estado = 'A'"
);
$stmt->bind_param(str_repeat('i', count($ids)), ...$ids);
$stmt->execute();
$result = $stmt->get_result();

$tokens = [];
while ($row = $result->fetch_assoc()) {
    $tokens[] = $row['ExpoPushToken'];
}
$stmt->close();

if ($tokens !== []) {
    try {
        rh_enviar_push(
            $tokens,
            'Te invitaron a una cadena 🔗',
            sprintf('Sumate a "%s" con tu historia.', $cadena['Tema']),
            ['ruta' => '/cadenas/' . $cadenaId]
        );
    } catch (Throwable $e) {
        error_log('cadena_invitar: ' . $e->getMessage());
    }
}

json_success(['invitados' => count($ids)], 'Invitaciones enviadas');
