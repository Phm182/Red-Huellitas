<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/push.php';
require_once __DIR__ . '/../../funciones/match.php';

$userId = rh_require_auth($conn);

$matchId = (int) ($_POST['matchId'] ?? 0);
$texto = trim($_POST['texto'] ?? '');

if ($matchId <= 0) {
    json_error('Falta matchId');
}
if ($texto === '' || mb_strlen($texto) > 1000) {
    json_error('El mensaje no puede estar vacío (máx 1000 caracteres)');
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
    json_error('No tenés permiso para escribir en esta conversación', 403);
}

$stmt = $conn->prepare('INSERT INTO MatchMensaje (MatchId, UserIdEmisor, Texto) VALUES (?, ?, ?)');
$stmt->bind_param('iis', $matchId, $userId, $texto);
$stmt->execute();
$mensajeId = (int) $stmt->insert_id;
$stmt->close();

$otroUserId = rh_match_otro_usuario_id($match, $userId);
$stmt = $conn->prepare('SELECT ExpoPushToken FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $otroUserId);
$stmt->execute();
$otro = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($otro && $otro['ExpoPushToken']) {
    $preview = mb_strlen($texto) > 80 ? mb_substr($texto, 0, 80) . '…' : $texto;
    rh_enviar_push([$otro['ExpoPushToken']], 'Nuevo mensaje de Match', $preview);
}

$stmt = $conn->prepare('SELECT * FROM MatchMensaje WHERE MensajeId = ?');
$stmt->bind_param('i', $mensajeId);
$stmt->execute();
$mensaje = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['mensaje' => rh_match_mensaje_publico($mensaje, $userId)], 'Mensaje enviado', 201);
