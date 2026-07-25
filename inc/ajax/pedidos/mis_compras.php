<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/pedido.php';

$userId = rh_require_auth($conn);

// Filtro opcional por ?estado= y paginación por ?cursor=/?limit=.
json_success(rh_pedidos_listar($conn, 'CompradorUserId', $userId));
