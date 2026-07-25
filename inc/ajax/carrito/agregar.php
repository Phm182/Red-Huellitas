<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';
require_once __DIR__ . '/../../funciones/carrito.php';

$userId = rh_require_auth($conn);

$productoId = (int) ($_POST['productoId'] ?? 0);
$cantidad = isset($_POST['cantidad']) && $_POST['cantidad'] !== '' ? (int) $_POST['cantidad'] : 1;

if ($productoId <= 0) {
    json_error('Falta productoId');
}
if ($cantidad < 1) {
    json_error('La cantidad debe ser al menos 1');
}

$stmt = $conn->prepare("SELECT * FROM Producto WHERE ProductoId = ? AND Estado = 'A'");
$stmt->bind_param('i', $productoId);
$stmt->execute();
$producto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$producto) {
    json_error('Publicación no encontrada', 404);
}
if ((int) $producto['UserId'] === $userId) {
    json_error('No podés agregar tu propia publicación al carrito');
}

$carritoId = rh_carrito_obtener_o_crear($conn, $userId);

$stmt = $conn->prepare('SELECT Cantidad FROM CarritoItem WHERE CarritoId = ? AND ProductoId = ?');
$stmt->bind_param('ii', $carritoId, $productoId);
$stmt->execute();
$existente = $stmt->get_result()->fetch_assoc();
$stmt->close();

$cantidadFinal = $cantidad + ($existente ? (int) $existente['Cantidad'] : 0);
if ($cantidadFinal > (int) $producto['Cantidad']) {
    json_error('No hay suficiente stock disponible para esa cantidad');
}

$stmt = $conn->prepare(
    'INSERT INTO CarritoItem (CarritoId, ProductoId, Cantidad) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE Cantidad = ?'
);
$stmt->bind_param('iiii', $carritoId, $productoId, $cantidadFinal, $cantidadFinal);
$stmt->execute();
$stmt->close();

json_success(rh_carrito_publico($conn, $carritoId, $userId), 'Agregado al carrito');
