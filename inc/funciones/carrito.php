<?php
/**
 * Helpers de Carrito compartidos por inc/ajax/carrito/*. Requiere que quien
 * llame también haya hecho require_once de funciones/producto.php.
 */

function rh_carrito_obtener_o_crear(mysqli $conn, int $userId): int
{
    $stmt = $conn->prepare('SELECT CarritoId FROM Carrito WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        return (int) $row['CarritoId'];
    }

    $stmt = $conn->prepare('INSERT INTO Carrito (UserId) VALUES (?)');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $carritoId = (int) $stmt->insert_id;
    $stmt->close();

    return $carritoId;
}

/**
 * Devuelve el carrito serializado: items agrupados por vendedor, con
 * subtotal por vendedor y total general.
 */
function rh_carrito_publico(mysqli $conn, int $carritoId, int $viewerUserId): array
{
    $stmt = $conn->prepare(
        'SELECT CarritoItem.CarritoItemId, CarritoItem.Cantidad AS CarritoCantidad, Producto.*,
                Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
                Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
         FROM CarritoItem
         JOIN Producto ON Producto.ProductoId = CarritoItem.ProductoId
         JOIN Usuario ON Usuario.UserId = Producto.UserId
         WHERE CarritoItem.CarritoId = ?
         ORDER BY Producto.UserId, CarritoItem.CarritoItemId'
    );
    $stmt->bind_param('i', $carritoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $porVendedor = [];
    while ($row = $result->fetch_assoc()) {
        $vendedorId = (int) $row['UserId'];
        if (!isset($porVendedor[$vendedorId])) {
            $porVendedor[$vendedorId] = ['vendedorUserId' => $vendedorId, 'items' => [], 'subtotal' => 0.0];
        }
        $cantidad = (int) $row['CarritoCantidad'];
        $precio = (float) $row['Precio'];
        $porVendedor[$vendedorId]['items'][] = [
            'carritoItemId' => (int) $row['CarritoItemId'],
            'producto' => rh_producto_publico($conn, $row, $viewerUserId),
            'cantidad' => $cantidad,
            'subtotal' => round($precio * $cantidad, 2),
        ];
        $porVendedor[$vendedorId]['subtotal'] += $precio * $cantidad;
    }
    $stmt->close();

    $grupos = array_values($porVendedor);
    $total = 0.0;
    foreach ($grupos as &$grupo) {
        $grupo['subtotal'] = round($grupo['subtotal'], 2);
        $total += $grupo['subtotal'];
    }
    unset($grupo);

    return ['grupos' => $grupos, 'total' => round($total, 2)];
}
