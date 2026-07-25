<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/match.php';

$userId = rh_require_auth($conn);

$matchId = (int) ($_POST['matchId'] ?? 0);
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
    json_error('No tenés permiso sobre esta conversación', 403);
}

$stmt = $conn->prepare("UPDATE MascotaMatch SET Estado = 'I' WHERE MatchId = ?");
$stmt->bind_param('i', $matchId);
$stmt->execute();
$stmt->close();

json_success(null, 'Match deshecho');
