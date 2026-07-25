<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/push.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/match.php';

$userId = rh_require_auth($conn);

$mascotaIdOrigen = (int) ($_POST['mascotaIdOrigen'] ?? 0);
$mascotaIdDestino = (int) ($_POST['mascotaIdDestino'] ?? 0);
$direccion = $_POST['direccion'] ?? '';

if ($mascotaIdOrigen <= 0 || $mascotaIdDestino <= 0) {
    json_error('Faltan mascotaIdOrigen/mascotaIdDestino');
}
if (!in_array($direccion, ['like', 'pass'], true)) {
    json_error('direccion debe ser like o pass');
}
if ($mascotaIdOrigen === $mascotaIdDestino) {
    json_error('No podés swipear tu propia mascota');
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaIdOrigen);
$stmt->execute();
$origen = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$origen) {
    json_error('Mascota de origen no encontrada', 404);
}
if ((int) $origen['UserId'] !== $userId) {
    json_error('No tenés permiso para usar esta mascota', 403);
}
if (!$origen['DisponibleParaMatch'] || $origen['Estado'] !== 'A') {
    json_error('Esta mascota no está disponible para Match');
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaIdDestino);
$stmt->execute();
$destino = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$destino) {
    json_error('Mascota candidata no encontrada', 404);
}
if ((int) $destino['UserId'] === $userId) {
    json_error('No podés swipear tu propia mascota');
}
if (!$destino['DisponibleParaMatch'] || $destino['Estado'] !== 'A') {
    json_error('Esa mascota ya no está disponible para Match');
}
if (!rh_usuario_verificado($conn, (int) $destino['UserId'])) {
    json_error('Esa mascota ya no está disponible para Match');
}

$stmt = $conn->prepare(
    'INSERT INTO MascotaMatchSwipe (MascotaIdOrigen, MascotaIdDestino, Direccion) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE SwipeId = SwipeId'
);
$stmt->bind_param('iis', $mascotaIdOrigen, $mascotaIdDestino, $direccion);
$stmt->execute();
$stmt->close();

if ($direccion !== 'like') {
    json_success(['match' => false]);
}

$stmt = $conn->prepare(
    "SELECT SwipeId FROM MascotaMatchSwipe WHERE MascotaIdOrigen = ? AND MascotaIdDestino = ? AND Direccion = 'like'"
);
$stmt->bind_param('ii', $mascotaIdDestino, $mascotaIdOrigen);
$stmt->execute();
$reciproco = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$reciproco) {
    json_success(['match' => false]);
}

if ($mascotaIdOrigen < $mascotaIdDestino) {
    $mascotaIdA = $mascotaIdOrigen;
    $userIdA = $userId;
    $mascotaIdB = $mascotaIdDestino;
    $userIdB = (int) $destino['UserId'];
} else {
    $mascotaIdA = $mascotaIdDestino;
    $userIdA = (int) $destino['UserId'];
    $mascotaIdB = $mascotaIdOrigen;
    $userIdB = $userId;
}

$stmt = $conn->prepare(
    'INSERT INTO MascotaMatch (MascotaIdA, MascotaIdB, UserIdA, UserIdB) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE MatchId = MatchId'
);
$stmt->bind_param('iiii', $mascotaIdA, $mascotaIdB, $userIdA, $userIdB);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT MatchId FROM MascotaMatch WHERE MascotaIdA = ? AND MascotaIdB = ?');
$stmt->bind_param('ii', $mascotaIdA, $mascotaIdB);
$stmt->execute();
$matchRow = $stmt->get_result()->fetch_assoc();
$stmt->close();

$matchId = (int) $matchRow['MatchId'];
$otroUserId = (int) $destino['UserId'];

$stmt = $conn->prepare('SELECT ExpoPushToken FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $otroUserId);
$stmt->execute();
$otroUsuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($otroUsuario && $otroUsuario['ExpoPushToken']) {
    rh_enviar_push(
        [$otroUsuario['ExpoPushToken']],
        '¡Tenés un nuevo match! 🐾',
        "A {$origen['Nombre']} y {$destino['Nombre']} se gustaron."
    );
}

json_success([
    'match' => true,
    'matchId' => $matchId,
    'mascotaCandidata' => rh_mascota_publica($conn, $destino, $userId),
], 'Match creado', 201);
