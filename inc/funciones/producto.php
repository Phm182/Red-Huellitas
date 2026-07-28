<?php
/**
 * Helpers compartidos para serializar Producto/ProductoFoto al shape público
 * usado por todos los endpoints de inc/ajax/productos/. Un Producto siempre
 * "está a la venta" (sin duplicidad necesito/ofrezco como Donacion) pero el
 * vendedor sí es un Usuario de la app, así que el contacto se resuelve vía
 * JOIN a Usuario igual que Donacion (requiere que quien llame también haya
 * hecho require_once de funciones/auth.php para rh_usuario_resumen()).
 */

function rh_producto_fotos(mysqli $conn, int $productoId): array
{
    $stmt = $conn->prepare(
        'SELECT ProductoFotoId, Path, Orden FROM ProductoFoto WHERE ProductoId = ? ORDER BY Orden ASC, ProductoFotoId ASC'
    );
    $stmt->bind_param('i', $productoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'productoFotoId' => (int) $row['ProductoFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

function rh_producto_categoria(mysqli $conn, int $categoriaId): ?array
{
    $stmt = $conn->prepare('SELECT CategoriaId, Codigo, Nombre FROM ProductoCategoriaCatalogo WHERE CategoriaId = ?');
    $stmt->bind_param('i', $categoriaId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return null;
    }
    return [
        'categoriaId' => (int) $row['CategoriaId'],
        'codigo' => $row['Codigo'],
        'nombre' => $row['Nombre'],
    ];
}

function rh_producto_es_favorito(mysqli $conn, int $productoId, int $viewerUserId): bool
{
    $stmt = $conn->prepare('SELECT 1 FROM ProductoFavorito WHERE ProductoId = ? AND UserId = ?');
    $stmt->bind_param('ii', $productoId, $viewerUserId);
    $stmt->execute();
    $existe = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $existe;
}

/**
 * Serializa un row de Producto (array asociativo de la DB, con columnas de
 * Usuario ya incluidas vía JOIN) al shape público. $distanciaKm viene del
 * query de listar.php cuando se aplicó el filtro geográfico (null en obtener.php).
 */
function rh_producto_publico(mysqli $conn, array $p, int $viewerUserId, ?float $distanciaKm = null): array
{
    $productoId = (int) $p['ProductoId'];
    $autorId = (int) $p['UserId'];
    $esDueno = $autorId === $viewerUserId;

    $whatsappVisible = $esDueno || ($p['WhatsappVisibilidad'] ?? null) === 'publica';

    $data = [
        'productoId' => $productoId,
        'tipoListado' => $p['TipoListado'],
        // categoriaId suelto además del objeto: la pantalla de edición necesita
        // el id para preseleccionar el picker.
        'categoriaId' => (int) $p['CategoriaId'],
        'categoria' => rh_producto_categoria($conn, (int) $p['CategoriaId']),
        'autor' => rh_usuario_resumen([
            'UserId' => $p['UserId'],
            'Username' => $p['Username'],
            'NombreCompleto' => $p['NombreCompleto'],
            'AvatarPath' => $p['AvatarPath'],
        ]),
        'whatsappNumero' => $whatsappVisible ? ($p['WhatsappNumero'] ?? null) : null,
        'nombre' => $p['Nombre'],
        'descripcion' => $p['Descripcion'],
        'precio' => (float) $p['Precio'],
        'cantidad' => (int) $p['Cantidad'],
        'especie' => $p['Especie'],
        'fotos' => rh_producto_fotos($conn, $productoId),
        'zonaDescripcion' => $p['ZonaDescripcion'],
        'zonaLat' => (float) $p['ZonaLat'],
        'zonaLng' => (float) $p['ZonaLng'],
        'distanciaKm' => $distanciaKm !== null ? round($distanciaKm, 1) : null,
        'esDueno' => $esDueno,
        'esFavorito' => rh_producto_es_favorito($conn, $productoId, $viewerUserId),
        'estado' => $p['Estado'],
        'createdAt' => $p['CreatedAt'],
    ];

    // Sólo para el dueño: en un listado ajeno no vale pagar la consulta de
    // pedidos por cada fila.
    if ($esDueno) {
        require_once __DIR__ . '/edicion.php';
        $bloqueo = rh_producto_motivo_bloqueo_edicion($conn, $productoId);
        $data['editable'] = $bloqueo === null;
        $data['motivoNoEditable'] = $bloqueo;
    }

    return $data;
}
