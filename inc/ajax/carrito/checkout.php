<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';
require_once __DIR__ . '/../../funciones/pedido.php';
require_once __DIR__ . '/../../funciones/carrito.php';
require_once __DIR__ . '/../../funciones/email.php';
require_once __DIR__ . '/../../funciones/comprobante.php';

$userId = rh_require_auth($conn);

$carritoId = rh_carrito_obtener_o_crear($conn, $userId);

$stmt = $conn->prepare(
    'SELECT CarritoItem.CarritoItemId, CarritoItem.Cantidad, Producto.ProductoId, Producto.UserId AS VendedorUserId,
            Producto.Nombre, Producto.Precio, Producto.Cantidad AS Stock
     FROM CarritoItem
     JOIN Producto ON Producto.ProductoId = CarritoItem.ProductoId
     WHERE CarritoItem.CarritoId = ?
     ORDER BY Producto.UserId'
);
$stmt->bind_param('i', $carritoId);
$stmt->execute();
$result = $stmt->get_result();

$porVendedor = [];
while ($row = $result->fetch_assoc()) {
    $vendedorId = (int) $row['VendedorUserId'];
    $cantidad = (int) $row['Cantidad'];
    if ($cantidad > (int) $row['Stock']) {
        json_error("No hay suficiente stock de \"{$row['Nombre']}\"");
    }
    $porVendedor[$vendedorId][] = $row;
}
$stmt->close();

if (count($porVendedor) === 0) {
    json_error('El carrito está vacío');
}

$config = rh_mp_config();
$backUrl = $config['MP_BACK_URL'] ?? '';
$pedidosCreados = [];

foreach ($porVendedor as $vendedorId => $items) {
    $montoProductos = 0.0;
    foreach ($items as $item) {
        $montoProductos += (float) $item['Precio'] * (int) $item['Cantidad'];
    }
    $montoProductos = round($montoProductos, 2);

    $tieneSuscripcion = rh_usuario_tiene_suscripcion_activa($conn, $vendedorId);
    $comision = rh_pedido_calcular_comision($montoProductos, $tieneSuscripcion);

    $metodoPago = 'coordinar';
    $estado = 'coordinando';

    $stmt = $conn->prepare(
        'INSERT INTO Pedido (CompradorUserId, VendedorUserId, MontoProductos, PorcentajeComision, MontoComision, MontoVendedor, MetodoPago, Estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param(
        'iiddddss',
        $userId,
        $vendedorId,
        $montoProductos,
        $comision['porcentaje'],
        $comision['montoComision'],
        $comision['montoVendedor'],
        $metodoPago,
        $estado
    );
    $stmt->execute();
    $pedidoId = (int) $stmt->insert_id;
    $stmt->close();

    foreach ($items as $item) {
        $nombreProducto = $item['Nombre'];
        $precioUnitario = (float) $item['Precio'];
        $cantidadItem = (int) $item['Cantidad'];
        $productoId = (int) $item['ProductoId'];
        $stmt = $conn->prepare(
            'INSERT INTO PedidoItem (PedidoId, ProductoId, NombreProducto, PrecioUnitario, Cantidad) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iisdi', $pedidoId, $productoId, $nombreProducto, $precioUnitario, $cantidadItem);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare('UPDATE Producto SET Cantidad = Cantidad - ? WHERE ProductoId = ?');
        $stmt->bind_param('ii', $cantidadItem, $productoId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("UPDATE Producto SET Estado = 'I' WHERE ProductoId = ? AND Cantidad <= 0");
        $stmt->bind_param('i', $productoId);
        $stmt->execute();
        $stmt->close();
    }

    $initPoint = null;

    $stmt = $conn->prepare('SELECT AccessToken FROM UsuarioMpCuenta WHERE UserId = ?');
    $stmt->bind_param('i', $vendedorId);
    $stmt->execute();
    $cuentaMp = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($cuentaMp) {
        try {
            $preferenceItems = array_map(
                fn ($item) => [
                    'title' => $item['Nombre'],
                    'quantity' => (int) $item['Cantidad'],
                    'unit_price' => (float) $item['Precio'],
                    'currency_id' => 'ARS',
                ],
                $items
            );
            $resultado = rh_mp_api_request('POST', '/checkout/preferences', [
                'items' => $preferenceItems,
                'marketplace_fee' => $comision['montoComision'],
                'external_reference' => "rh:pedido:$pedidoId",
                'back_urls' => ['success' => $backUrl, 'failure' => $backUrl, 'pending' => $backUrl],
            ], $cuentaMp['AccessToken']);

            if ($resultado['httpCode'] < 400 && !empty($resultado['data']['id'])) {
                $preferenceId = $resultado['data']['id'];
                $initPoint = $resultado['data']['init_point'] ?? $resultado['data']['sandbox_init_point'] ?? null;
                $metodoPago = 'mercadopago';
                $estado = 'pendiente';

                $stmt = $conn->prepare(
                    "UPDATE Pedido SET MetodoPago = 'mercadopago', Estado = 'pendiente', MpPreferenceId = ? WHERE PedidoId = ?"
                );
                $stmt->bind_param('si', $preferenceId, $pedidoId);
                $stmt->execute();
                $stmt->close();
            }
        } catch (RuntimeException $e) {
            // Sin credenciales/conexión real disponible: el pedido queda en 'coordinar' (ya seteado por defecto).
        }
    }

    // Comprobante por mail a comprador y vendedor. rh_comprobante_enviar_email()
    // ya atrapa todo internamente: si el SMTP no está configurado o falla, la
    // compra queda hecha igual (mismo criterio que el fallback a 'coordinar').
    rh_comprobante_enviar_email($conn, $pedidoId);

    $stmt = $conn->prepare('SELECT * FROM Pedido WHERE PedidoId = ?');
    $stmt->bind_param('i', $pedidoId);
    $stmt->execute();
    $pedido = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $pedidoPublico = rh_pedido_publico($conn, $pedido, $userId);
    $pedidoPublico['initPoint'] = $initPoint;
    $pedidosCreados[] = $pedidoPublico;
}

$stmt = $conn->prepare('DELETE FROM CarritoItem WHERE CarritoId = ?');
$stmt->bind_param('i', $carritoId);
$stmt->execute();
$stmt->close();

json_success(['pedidos' => $pedidosCreados], 'Compra realizada', 201);
