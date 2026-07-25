<?php
/**
 * Devuelve una URL de un solo uso para abrir el PDF del comprobante.
 *
 * Existe porque Linking.openURL() —la forma en que la app abre un archivo, en
 * web y en nativo— no puede mandar el header Authorization. En vez de exponer
 * el token de sesión en la query string (quedaría en el historial y en los logs
 * de Apache), se emite un token efímero de un solo uso.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/pedido.php';
require_once __DIR__ . '/../../funciones/comprobante.php';

$userId = rh_require_auth($conn);

$pedidoId = (int) ($_POST['pedidoId'] ?? 0);
if ($pedidoId <= 0) {
    json_error('Falta pedidoId');
}

if (!rh_comprobante_disponible()) {
    json_error('La generación de comprobantes no está disponible (falta composer install)', 503);
}

$pedido = rh_pedido_cargar_con_acceso($conn, $pedidoId, $userId);
if (!$pedido) {
    json_error('No tenés acceso a este pedido', 403);
}

// Los tokens que se piden y nunca se usan quedarían acumulándose; se limpian
// acá los ya vencidos, que es el único momento en que alguien mira esta tabla.
$conn->query('DELETE FROM PedidoComprobanteToken WHERE CreatedAt < NOW() - INTERVAL 1 HOUR');

$token = bin2hex(random_bytes(32));

$stmt = $conn->prepare('INSERT INTO PedidoComprobanteToken (Token, PedidoId, UserId) VALUES (?, ?, ?)');
$stmt->bind_param('sii', $token, $pedidoId, $userId);
$stmt->execute();
$stmt->close();

// URL absoluta al endpoint hermano, derivada del request actual.
// Cada segmento se encodea por separado: en este entorno la app vive bajo
// "/Red Huellitas/", y un espacio sin encodear hace que la URL no sea usable.
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
$dirEncoded = implode('/', array_map('rawurlencode', explode('/', $dir)));
$url = "$scheme://$host$dirEncoded/comprobante.php?token=" . urlencode($token);

json_success([
    'url' => $url,
    'numeroComprobante' => rh_pedido_numero_comprobante($pedidoId),
]);
