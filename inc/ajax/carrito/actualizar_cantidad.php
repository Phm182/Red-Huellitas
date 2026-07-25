<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';
require_once __DIR__ . '/../../funciones/carrito.php';

$userId = rh_require_auth($conn);

$carritoItemId = (int) ($_POST['carritoItemId'] ?? 0);
$cantidad = (int) ($_POST['cantidad'] ?? 0);

if ($carritoItemId <= 0) {
    json_error('Falta carritoItemId');
}
if ($cantidad < 1) {
    json_error('La cantidad debe ser al menos 1');
}

$carritoId = rh_carrito_obtener_o_crear($conn, $userId);

$stmt = $conn->prepare(
    'SELECT CarritoItem.CarritoItemId, Producto.Cantidad AS Stock
     FROM CarritoItem JOIN Producto ON Producto.ProductoId = CarritoItem.ProductoId
     WHERE CarritoItem.CarritoItemId = ? AND CarritoItem.CarritoId = ?'
);
$stmt->bind_param('ii', $carritoItemId, $carritoId);
$stmt->execute();
$item = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$item) {
    json_error('Ítem de carrito no encontrado', 404);
}
if ($cantidad > (int) $item['Stock']) {
    json_error('No hay suficiente stock disponible para esa cantidad');
}

$stmt = $conn->prepare('UPDATE CarritoItem SET Cantidad = ? WHERE CarritoItemId = ?');
$stmt->bind_param('ii', $cantidad, $carritoItemId);
$stmt->execute();
$stmt->close();

json_success(rh_carrito_publico($conn, $carritoId, $userId), 'Cantidad actualizada');
