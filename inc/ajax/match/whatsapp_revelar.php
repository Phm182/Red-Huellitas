<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/push.php';
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

if (!$match || $match['Estado'] !== 'A') {
    json_error('Match no encontrado', 404);
}
if (!rh_match_pertenece($match, $userId)) {
    json_error('No tenés permiso sobre esta conversación', 403);
}

$stmt = $conn->prepare('SELECT 1 FROM MatchWhatsappConsentimiento WHERE MatchId = ? AND UserId = ?');
$stmt->bind_param('ii', $matchId, $userId);
$stmt->execute();
$yaHabiaConsentimiento = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$yaHabiaConsentimiento) {
    $stmt = $conn->prepare('INSERT INTO MatchWhatsappConsentimiento (MatchId, UserId) VALUES (?, ?)');
    $stmt->bind_param('ii', $matchId, $userId);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT UserId FROM MatchWhatsappConsentimiento WHERE MatchId = ?');
$stmt->bind_param('i', $matchId);
$stmt->execute();
$result = $stmt->get_result();
$consentimientos = [];
while ($row = $result->fetch_assoc()) {
    $consentimientos[] = (int) $row['UserId'];
}
$stmt->close();

$revelado = count($consentimientos) >= 2;

if (!$revelado) {
    json_success(['revelado' => false]);
}

$otroUserId = rh_match_otro_usuario_id($match, $userId);
$stmt = $conn->prepare('SELECT NombreCompleto, WhatsappNumero, ExpoPushToken FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $otroUserId);
$stmt->execute();
$otro = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Si este llamado recién completó el par (yo no había consentido antes), avisarle al otro.
if (!$yaHabiaConsentimiento && $otro && $otro['ExpoPushToken']) {
    rh_enviar_push([$otro['ExpoPushToken']], '¡WhatsApp revelado!', 'Ya pueden verse el número de WhatsApp en el chat del match.');
}

json_success([
    'revelado' => true,
    'whatsappNumero' => $otro['WhatsappNumero'] ?? null,
    'nombreCompleto' => $otro['NombreCompleto'] ?? null,
]);
