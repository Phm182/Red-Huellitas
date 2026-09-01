<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$postId = (int) ($_POST['postId'] ?? 0);
$tipo = $_POST['tipo'] ?? '';

if ($postId <= 0) {
    json_error('Falta postId');
}
$tiposValidos = ['like', 'me_divierte', 'amor', 'asombro', 'triste', 'abrazo', 'huella', 'apoyo', 'guau', 'michi'];
if (!in_array($tipo, $tiposValidos, true)) {
    json_error('tipo de reacción no válido');
}

$stmt = $conn->prepare("SELECT PostId, UserId FROM Post WHERE PostId = ? AND Estado = 'A'");
$stmt->bind_param('i', $postId);
$stmt->execute();
$post = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$post) {
    json_error('Publicación no encontrada', 404);
}
$autorId = (int) $post['UserId'];

// Si ya había reaccionado antes (con cualquier tipo), cambiar de reacción no
// tiene por qué volver a notificar — mismo criterio que
// `historias/reaccionar.php`.
$stmt = $conn->prepare('SELECT 1 FROM PostReaccion WHERE PostId = ? AND UserId = ?');
$stmt->bind_param('ii', $postId, $userId);
$stmt->execute();
$yaHabiaReaccionado = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();

$stmt = $conn->prepare(
    'INSERT INTO PostReaccion (PostId, UserId, Tipo) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE Tipo = VALUES(Tipo)'
);
$stmt->bind_param('iis', $postId, $userId, $tipo);
$stmt->execute();
$stmt->close();

if (!$yaHabiaReaccionado && $autorId !== $userId) {
    $stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $yo = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $nombre = !empty($yo['Username']) ? '@' . $yo['Username'] : ($yo['NombreCompleto'] ?? 'Alguien');

    rh_notificar(
        $conn,
        [$autorId],
        'post_reaccion',
        'Reaccionaron a tu publicación',
        "$nombre reaccionó a tu publicación",
        '/(app)/publicaciones/' . $postId,
        ['actorUserId' => $userId]
    );
}

json_success([
    'miReaccion' => $tipo,
    'conteos' => rh_post_conteos($conn, $postId),
]);
