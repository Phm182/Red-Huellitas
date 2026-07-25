<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    "SELECT Producto.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM ProductoFavorito
     JOIN Producto ON Producto.ProductoId = ProductoFavorito.ProductoId
     JOIN Usuario ON Usuario.UserId = Producto.UserId
     WHERE ProductoFavorito.UserId = ? AND Producto.Estado = 'A'
     ORDER BY ProductoFavorito.CreatedAt DESC"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$favoritos = [];
while ($row = $result->fetch_assoc()) {
    $favoritos[] = rh_producto_publico($conn, $row, $userId);
}
$stmt->close();

json_success(['favoritos' => $favoritos]);
