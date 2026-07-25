<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/pedido.php';

$userId = rh_require_auth($conn);

$pedidoId = (int) ($_GET['pedidoId'] ?? 0);
if ($pedidoId <= 0) {
    json_error('Falta pedidoId');
}

$pedido = rh_pedido_cargar_con_acceso($conn, $pedidoId, $userId);
if (!$pedido) {
    // Mismo mensaje para "no existe" y "no es tuyo": no filtramos qué pedidos
    // existen a alguien que no participa en ellos.
    json_error('No tenés acceso a este pedido', 403);
}

json_success(['pedido' => rh_pedido_publico($conn, $pedido, $userId)]);
