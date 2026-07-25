<?php
/**
 * Emite el PDF del comprobante. Endpoint público pero gateado por un token de
 * un solo uso emitido por comprobante_link.php (ver el porqué ahí).
 *
 * El PDF se genera al vuelo, no se guarda en disco: siempre refleja el estado
 * real del pedido y no deja archivos viejos acumulándose.
 *
 * Molde de "servir un archivo con control de acceso": mascotas/carnet_ver.php.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/pedido.php';
require_once __DIR__ . '/../../funciones/comprobante.php';

const RH_COMPROBANTE_TOKEN_MINUTOS = 10;

$token = (string) ($_GET['token'] ?? '');
if ($token === '') {
    json_error('Falta el token del comprobante');
}

$stmt = $conn->prepare(
    'SELECT PedidoId, UserId, CreatedAt,
            TIMESTAMPDIFF(MINUTE, CreatedAt, NOW()) AS Antiguedad
     FROM PedidoComprobanteToken WHERE Token = ?'
);
$stmt->bind_param('s', $token);
$stmt->execute();
$fila = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$fila) {
    json_error('El enlace del comprobante no es válido o ya se usó', 403);
}

// Un solo uso: se borra apenas se resuelve, haya vencido o no.
$stmt = $conn->prepare('DELETE FROM PedidoComprobanteToken WHERE Token = ?');
$stmt->bind_param('s', $token);
$stmt->execute();
$stmt->close();

if ((int) $fila['Antiguedad'] >= RH_COMPROBANTE_TOKEN_MINUTOS) {
    json_error('El enlace del comprobante venció, pedí uno nuevo desde la app', 403);
}

$pedidoId = (int) $fila['PedidoId'];
$datos = rh_comprobante_datos($conn, $pedidoId);
if ($datos === null) {
    json_error('Pedido no encontrado', 404);
}

// La copia del vendedor incluye el desglose de comisión; la del comprador no.
$paraVendedor = (int) $fila['UserId'] === (int) $datos['pedido']['VendedorUserId'];

try {
    $pdf = rh_comprobante_pdf($datos, $paraVendedor);
} catch (RuntimeException $e) {
    error_log('comprobante.php: ' . $e->getMessage());
    json_error('No se pudo generar el comprobante', 503);
}

$nombre = 'comprobante-' . $datos['numero'] . '.pdf';

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $nombre . '"');
header('Content-Length: ' . strlen($pdf));
header('Cache-Control: private, max-age=0, no-cache');
echo $pdf;
exit;
