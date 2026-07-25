<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/producto.php';

const RH_PRODUCTO_RADIOS_VALIDOS = [20, 50, 100];

$viewerUserId = rh_require_auth($conn);

$tipoListado = $_GET['tipoListado'] ?? '';
$categoriaId = isset($_GET['categoriaId']) && $_GET['categoriaId'] !== '' ? (int) $_GET['categoriaId'] : null;
$especie = $_GET['especie'] ?? '';
$radioKm = isset($_GET['radioKm']) && $_GET['radioKm'] !== '' ? (int) $_GET['radioKm'] : null;
if ($radioKm !== null && !in_array($radioKm, RH_PRODUCTO_RADIOS_VALIDOS, true)) {
    json_error('radioKm debe ser 20, 50 o 100');
}

$camposSelect = "Producto.*,
        Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
        Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad";
$joins = "FROM Producto JOIN Usuario ON Usuario.UserId = Producto.UserId";

if ($radioKm !== null) {
    $stmt = $conn->prepare('SELECT ZonaLat, ZonaLng FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $viewerUserId);
    $stmt->execute();
    $viewer = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$viewer || $viewer['ZonaLat'] === null || $viewer['ZonaLng'] === null) {
        json_error('Necesitás tu zona registrada para filtrar por cercanía');
    }
    $viewerLat = (float) $viewer['ZonaLat'];
    $viewerLng = (float) $viewer['ZonaLng'];

    $sql = "SELECT $camposSelect,
                (6371 * ACOS(
                    COS(RADIANS(?)) * COS(RADIANS(Producto.ZonaLat)) * COS(RADIANS(Producto.ZonaLng) - RADIANS(?))
                    + SIN(RADIANS(?)) * SIN(RADIANS(Producto.ZonaLat))
                )) AS DistanciaKm
            $joins
            WHERE Producto.Estado = 'A'";
    $types = 'ddd';
    $params = [$viewerLat, $viewerLng, $viewerLat];

    if (in_array($tipoListado, ['producto', 'servicio'], true)) {
        $sql .= ' AND Producto.TipoListado = ?';
        $types .= 's';
        $params[] = $tipoListado;
    }
    if ($categoriaId !== null) {
        $sql .= ' AND Producto.CategoriaId = ?';
        $types .= 'i';
        $params[] = $categoriaId;
    }
    if (in_array($especie, ['perro', 'gato', 'otro'], true)) {
        $sql .= ' AND Producto.Especie = ?';
        $types .= 's';
        $params[] = $especie;
    }
    $sql .= ' HAVING DistanciaKm <= ? ORDER BY DistanciaKm ASC LIMIT 50';
    $types .= 'd';
    $params[] = $radioKm;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $listados = [];
    while ($row = $result->fetch_assoc()) {
        $listados[] = rh_producto_publico($conn, $row, $viewerUserId, (float) $row['DistanciaKm']);
    }
    $stmt->close();

    json_success(['listados' => $listados, 'nextCursor' => null]);
}

// Sin radioKm ("Todos"): cronológico de siempre, con cursor.
$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

$sql = "SELECT $camposSelect $joins WHERE Producto.Estado = 'A'";
$types = '';
$params = [];

if (in_array($tipoListado, ['producto', 'servicio'], true)) {
    $sql .= ' AND Producto.TipoListado = ?';
    $types .= 's';
    $params[] = $tipoListado;
}
if ($categoriaId !== null) {
    $sql .= ' AND Producto.CategoriaId = ?';
    $types .= 'i';
    $params[] = $categoriaId;
}
if (in_array($especie, ['perro', 'gato', 'otro'], true)) {
    $sql .= ' AND Producto.Especie = ?';
    $types .= 's';
    $params[] = $especie;
}
if ($cursor !== null) {
    $sql .= ' AND Producto.ProductoId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY Producto.ProductoId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$listados = [];
while ($row = $result->fetch_assoc()) {
    $listados[] = rh_producto_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($listados) === $limit ? $listados[count($listados) - 1]['productoId'] : null;

json_success(['listados' => $listados, 'nextCursor' => $nextCursor]);
