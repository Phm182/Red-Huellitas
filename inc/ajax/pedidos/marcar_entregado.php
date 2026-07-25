<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$pedidoId = (int) ($_POST['pedidoId'] ?? 0);
if ($pedidoId <= 0) {
    json_error('Falta pedidoId');
}

$stmt = $conn->prepare('SELECT * FROM Pedido WHERE PedidoId = ?');
$stmt->bind_param('i', $pedidoId);
$stmt->execute();
$pedido = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$pedido) {
    json_error('Pedido no encontrado', 404);
}
if ((int) $pedido['VendedorUserId'] !== $userId) {
    json_error('No tenés permiso para marcar este pedido', 403);
}
if (!in_array($pedido['Estado'], ['coordinando', 'pagado'], true)) {
    json_error('Este pedido no se puede marcar como entregado en su estado actual');
}

$stmt = $conn->prepare("UPDATE Pedido SET Estado = 'entregado' WHERE PedidoId = ?");
$stmt->bind_param('i', $pedidoId);
$stmt->execute();
$stmt->close();

json_success(null, 'Pedido marcado como entregado');
