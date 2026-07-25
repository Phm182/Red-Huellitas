<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$adopcionId = (int) ($_POST['adopcionId'] ?? 0);
if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}

$stmt = $conn->prepare("SELECT AdopcionId FROM Adopcion WHERE AdopcionId = ? AND Estado = 'A'");
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Publicación de adopción no encontrada', 404);
}
$stmt->close();

$stmt = $conn->prepare(
    'INSERT INTO AdopcionFavorito (AdopcionId, UserId) VALUES (?, ?) ON DUPLICATE KEY UPDATE AdopcionId = AdopcionId'
);
$stmt->bind_param('ii', $adopcionId, $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Agregado a favoritos');
