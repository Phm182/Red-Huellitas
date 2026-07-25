<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/carrito.php';

$userId = rh_require_auth($conn);

$carritoId = rh_carrito_obtener_o_crear($conn, $userId);

$stmt = $conn->prepare('DELETE FROM CarritoItem WHERE CarritoId = ?');
$stmt->bind_param('i', $carritoId);
$stmt->execute();
$stmt->close();

json_success(null, 'Carrito vaciado');
