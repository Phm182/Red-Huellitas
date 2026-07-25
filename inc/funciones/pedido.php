<?php
/**
 * Helpers de Pedido compartidos por inc/ajax/pedidos/ e inc/ajax/carrito/checkout.php.
 */

const RH_PEDIDO_PORCENTAJE_COMISION = 10.0;

/**
 * Calcula la retención de la plataforma sobre un monto: 0% si el vendedor
 * tiene suscripción activa (Fase 6a), 10% si no.
 */
function rh_pedido_calcular_comision(float $monto, bool $tieneSuscripcionActiva): array
{
    $porcentaje = $tieneSuscripcionActiva ? 0.0 : RH_PEDIDO_PORCENTAJE_COMISION;
    $montoComision = round($monto * $porcentaje / 100, 2);
    $montoVendedor = round($monto - $montoComision, 2);

    return [
        'porcentaje' => $porcentaje,
        'montoComision' => $montoComision,
        'montoVendedor' => $montoVendedor,
    ];
}

function rh_pedido_items(mysqli $conn, int $pedidoId): array
{
    $stmt = $conn->prepare(
        'SELECT PedidoItemId, ProductoId, NombreProducto, PrecioUnitario, Cantidad FROM PedidoItem WHERE PedidoId = ?'
    );
    $stmt->bind_param('i', $pedidoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            'pedidoItemId' => (int) $row['PedidoItemId'],
            'productoId' => (int) $row['ProductoId'],
            'nombreProducto' => $row['NombreProducto'],
            'precioUnitario' => (float) $row['PrecioUnitario'],
            'cantidad' => (int) $row['Cantidad'],
        ];
    }
    $stmt->close();

    return $items;
}

/**
 * Número de comprobante legible del pedido. PedidoId ya es único y monótono,
 * no hace falta una secuencia aparte.
 */
function rh_pedido_numero_comprobante(int $pedidoId): string
{
    return 'RH-' . str_pad((string) $pedidoId, 8, '0', STR_PAD_LEFT);
}

/**
 * Trae varios usuarios en una sola query, con cache por request. Las listas de
 * pedidos repiten mucho al mismo usuario (en Mis Compras el comprador es
 * siempre el viewer), así que sin esto rh_pedido_publico() haría 2 queries por
 * cada pedido de la lista.
 *
 * @param int[] $userIds
 * @return array<int, array> indexado por UserId
 */
function rh_pedido_usuarios(mysqli $conn, array $userIds): array
{
    static $cache = [];

    $faltantes = array_values(array_unique(array_filter(
        $userIds,
        static fn ($id) => $id > 0 && !isset($cache[$id])
    )));

    if ($faltantes !== []) {
        $placeholders = implode(',', array_fill(0, count($faltantes), '?'));
        $stmt = $conn->prepare(
            "SELECT UserId, Username, NombreCompleto, AvatarPath, WhatsappNumero, WhatsappVisibilidad
             FROM Usuario WHERE UserId IN ($placeholders)"
        );
        $stmt->bind_param(str_repeat('i', count($faltantes)), ...$faltantes);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $cache[(int) $row['UserId']] = $row;
        }
        $stmt->close();
    }

    $salida = [];
    foreach ($userIds as $id) {
        if (isset($cache[$id])) {
            $salida[$id] = $cache[$id];
        }
    }
    return $salida;
}

function rh_pedido_publico(mysqli $conn, array $p, int $viewerUserId): array
{
    $pedidoId = (int) $p['PedidoId'];
    $compradorId = (int) $p['CompradorUserId'];
    $vendedorId = (int) $p['VendedorUserId'];

    $usuarios = rh_pedido_usuarios($conn, [$compradorId, $vendedorId]);
    $comprador = $usuarios[$compradorId] ?? [];
    $vendedor = $usuarios[$vendedorId] ?? [];

    $esComprador = $compradorId === $viewerUserId;
    $esVendedor = $vendedorId === $viewerUserId;
    // El comprador de este pedido ve el WhatsApp del vendedor aunque lo tenga
    // en privado: ya hay una transacción real entre ellos que coordinar.
    $whatsappVisible = $esVendedor || ($vendedor['WhatsappVisibilidad'] ?? null) === 'publica' || $esComprador;

    return [
        'pedidoId' => $pedidoId,
        'numeroComprobante' => rh_pedido_numero_comprobante($pedidoId),
        'compradorUserId' => $compradorId,
        'comprador' => rh_usuario_resumen([
            'UserId' => $compradorId,
            'Username' => $comprador['Username'] ?? null,
            'NombreCompleto' => $comprador['NombreCompleto'] ?? null,
            'AvatarPath' => $comprador['AvatarPath'] ?? null,
        ]),
        'vendedor' => rh_usuario_resumen([
            'UserId' => $vendedorId,
            'Username' => $vendedor['Username'] ?? null,
            'NombreCompleto' => $vendedor['NombreCompleto'] ?? null,
            'AvatarPath' => $vendedor['AvatarPath'] ?? null,
        ]),
        'vendedorWhatsapp' => $whatsappVisible ? ($vendedor['WhatsappNumero'] ?? null) : null,
        'items' => rh_pedido_items($conn, $pedidoId),
        'montoProductos' => (float) $p['MontoProductos'],
        'porcentajeComision' => (float) $p['PorcentajeComision'],
        'montoComision' => (float) $p['MontoComision'],
        'montoVendedor' => (float) $p['MontoVendedor'],
        'metodoPago' => $p['MetodoPago'],
        'estado' => $p['Estado'],
        'comprobanteEnviadoEn' => $p['ComprobanteEnviadoEn'] ?? null,
        'esComprador' => $esComprador,
        'esVendedor' => $esVendedor,
        'createdAt' => $p['CreatedAt'],
    ];
}

const RH_PEDIDO_ESTADOS = ['pendiente', 'pagado', 'coordinando', 'entregado', 'cancelado'];

/**
 * Listado paginado de pedidos para un lado de la operación.
 * Mismo patrón de cursor que productos/listar.php: se pagina por PedidoId
 * descendente y se devuelve nextCursor (null cuando no hay más).
 *
 * @param string $columna 'CompradorUserId' o 'VendedorUserId' (nunca viene del
 *                        request: lo fija el endpoint, no es interpolable).
 */
function rh_pedidos_listar(mysqli $conn, string $columna, int $userId): array
{
    if (!in_array($columna, ['CompradorUserId', 'VendedorUserId'], true)) {
        throw new InvalidArgumentException('Columna de pedido inválida');
    }

    $estado = isset($_GET['estado']) && $_GET['estado'] !== '' ? (string) $_GET['estado'] : null;
    if ($estado !== null && !in_array($estado, RH_PEDIDO_ESTADOS, true)) {
        $estado = null; // un estado desconocido no filtra nada, no rompe
    }
    $cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
    $limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

    $sql = "SELECT * FROM Pedido WHERE $columna = ?";
    $tipos = 'i';
    $params = [$userId];

    if ($estado !== null) {
        $sql .= ' AND Estado = ?';
        $tipos .= 's';
        $params[] = $estado;
    }
    if ($cursor !== null) {
        $sql .= ' AND PedidoId < ?';
        $tipos .= 'i';
        $params[] = $cursor;
    }
    $sql .= ' ORDER BY PedidoId DESC LIMIT ' . $limit;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($tipos, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $filas = [];
    while ($row = $result->fetch_assoc()) {
        $filas[] = $row;
    }
    $stmt->close();

    // Precarga de usuarios en una sola query para que el serializer no haga N+1.
    $ids = [];
    foreach ($filas as $fila) {
        $ids[] = (int) $fila['CompradorUserId'];
        $ids[] = (int) $fila['VendedorUserId'];
    }
    if ($ids !== []) {
        rh_pedido_usuarios($conn, $ids);
    }

    $pedidos = array_map(
        static fn (array $fila) => rh_pedido_publico($conn, $fila, $userId),
        $filas
    );

    $nextCursor = count($pedidos) === $limit ? $pedidos[count($pedidos) - 1]['pedidoId'] : null;

    return ['pedidos' => $pedidos, 'nextCursor' => $nextCursor];
}

/**
 * Carga un pedido validando que el viewer sea comprador o vendedor.
 * Devuelve null si no existe o si no tiene acceso — quien llama decide si eso
 * es 404 o 403.
 */
function rh_pedido_cargar_con_acceso(mysqli $conn, int $pedidoId, int $viewerUserId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM Pedido WHERE PedidoId = ?');
    $stmt->bind_param('i', $pedidoId);
    $stmt->execute();
    $pedido = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$pedido) {
        return null;
    }
    if ((int) $pedido['CompradorUserId'] !== $viewerUserId && (int) $pedido['VendedorUserId'] !== $viewerUserId) {
        return null;
    }
    return $pedido;
}
