<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$productoId = (int) ($_POST['productoId'] ?? 0);
if ($productoId <= 0) {
    json_error('Falta productoId');
}

$stmt = $conn->prepare('SELECT UserId FROM Producto WHERE ProductoId = ?');
$stmt->bind_param('i', $productoId);
$stmt->execute();
$producto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$producto) {
    json_error('Publicación no encontrada', 404);
}
if ((int) $producto['UserId'] !== $userId) {
    json_error('No tenés permiso para eliminar esta publicación', 403);
}

$stmt = $conn->prepare("UPDATE Producto SET Estado = 'I' WHERE ProductoId = ?");
$stmt->bind_param('i', $productoId);
$stmt->execute();
$stmt->close();

json_success(null, 'Publicación eliminada');
