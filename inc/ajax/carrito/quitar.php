<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';
require_once __DIR__ . '/../../funciones/carrito.php';

$userId = rh_require_auth($conn);

$carritoItemId = (int) ($_POST['carritoItemId'] ?? 0);
if ($carritoItemId <= 0) {
    json_error('Falta carritoItemId');
}

$carritoId = rh_carrito_obtener_o_crear($conn, $userId);

$stmt = $conn->prepare('DELETE FROM CarritoItem WHERE CarritoItemId = ? AND CarritoId = ?');
$stmt->bind_param('ii', $carritoItemId, $carritoId);
$stmt->execute();
$stmt->close();

json_success(rh_carrito_publico($conn, $carritoId, $userId), 'Quitado del carrito');
