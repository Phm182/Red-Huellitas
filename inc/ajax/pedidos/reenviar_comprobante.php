<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/pedido.php';
require_once __DIR__ . '/../../funciones/email.php';
require_once __DIR__ . '/../../funciones/comprobante.php';

$userId = rh_require_auth($conn);

$pedidoId = (int) ($_POST['pedidoId'] ?? 0);
if ($pedidoId <= 0) {
    json_error('Falta pedidoId');
}

if (!rh_email_configurado()) {
    json_error('El envío de emails no está configurado todavía', 503);
}

$pedido = rh_pedido_cargar_con_acceso($conn, $pedidoId, $userId);
if (!$pedido) {
    json_error('No tenés acceso a este pedido', 403);
}

$resultado = rh_comprobante_enviar_email($conn, $pedidoId);

if (!$resultado['comprador'] && !$resultado['vendedor']) {
    json_error('No se pudo enviar el comprobante, intentá de nuevo en un rato');
}

json_success(null, 'Comprobante enviado por email');
