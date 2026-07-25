<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/match.php';

$userId = rh_require_auth($conn);

$matchId = (int) ($_GET['matchId'] ?? 0);
if ($matchId <= 0) {
    json_error('Falta matchId');
}

$stmt = $conn->prepare('SELECT * FROM MascotaMatch WHERE MatchId = ?');
$stmt->bind_param('i', $matchId);
$stmt->execute();
$match = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$match) {
    json_error('Match no encontrado', 404);
}
if (!rh_match_pertenece($match, $userId)) {
    json_error('No tenés permiso para ver esta conversación', 403);
}

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(100, (int) $_GET['limit'])) : 30;

$sql = 'SELECT * FROM MatchMensaje WHERE MatchId = ?';
$types = 'i';
$params = [$matchId];

if ($cursor !== null) {
    $sql .= ' AND MensajeId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY MensajeId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$mensajes = [];
while ($row = $result->fetch_assoc()) {
    $mensajes[] = rh_match_mensaje_publico($row, $userId);
}
$stmt->close();

$nextCursor = count($mensajes) === $limit ? $mensajes[count($mensajes) - 1]['mensajeId'] : null;

json_success(['mensajes' => $mensajes, 'nextCursor' => $nextCursor]);
