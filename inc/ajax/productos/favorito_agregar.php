<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$productoId = (int) ($_POST['productoId'] ?? 0);
if ($productoId <= 0) {
    json_error('Falta productoId');
}

$stmt = $conn->prepare("SELECT ProductoId FROM Producto WHERE ProductoId = ? AND Estado = 'A'");
$stmt->bind_param('i', $productoId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Publicación no encontrada', 404);
}
$stmt->close();

$stmt = $conn->prepare(
    'INSERT INTO ProductoFavorito (ProductoId, UserId) VALUES (?, ?) ON DUPLICATE KEY UPDATE ProductoId = ProductoId'
);
$stmt->bind_param('ii', $productoId, $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Agregado a favoritos');
