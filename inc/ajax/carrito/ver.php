<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';
require_once __DIR__ . '/../../funciones/carrito.php';

$userId = rh_require_auth($conn);

$carritoId = rh_carrito_obtener_o_crear($conn, $userId);

json_success(rh_carrito_publico($conn, $carritoId, $userId));
