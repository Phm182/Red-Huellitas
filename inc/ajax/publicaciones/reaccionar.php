<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

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

$stmt = $conn->prepare("SELECT PostId FROM Post WHERE PostId = ? AND Estado = 'A'");
$stmt->bind_param('i', $postId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Publicación no encontrada', 404);
}
$stmt->close();

$stmt = $conn->prepare(
    'INSERT INTO PostReaccion (PostId, UserId, Tipo) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE Tipo = VALUES(Tipo)'
);
$stmt->bind_param('iis', $postId, $userId, $tipo);
$stmt->execute();
$stmt->close();

json_success([
    'miReaccion' => $tipo,
    'conteos' => rh_post_conteos($conn, $postId),
]);
