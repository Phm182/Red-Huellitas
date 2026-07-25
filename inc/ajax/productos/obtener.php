<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';

$viewerUserId = rh_require_auth($conn);

$productoId = (int) ($_GET['productoId'] ?? 0);
if ($productoId <= 0) {
    json_error('Falta productoId');
}

$stmt = $conn->prepare(
    "SELECT Producto.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM Producto JOIN Usuario ON Usuario.UserId = Producto.UserId
     WHERE Producto.ProductoId = ?"
);
$stmt->bind_param('i', $productoId);
$stmt->execute();
$producto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$producto || $producto['Estado'] !== 'A') {
    json_error('Publicación no encontrada', 404);
}

json_success(['producto' => rh_producto_publico($conn, $producto, $viewerUserId)]);
