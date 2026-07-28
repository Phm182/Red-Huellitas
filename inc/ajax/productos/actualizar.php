<?php
/**
 * Editar un producto o servicio publicado (sólo el dueño).
 *
 * `tipoListado` no se cambia: pasar de producto a servicio (o al revés) cambia
 * las reglas de la publicación, no sus datos.
 *
 * Se puede editar aunque haya pedidos en curso: esos pedidos guardan su propia
 * copia del nombre y el precio en `PedidoItem`, así que no los afecta.
 * Ver rh_producto_motivo_bloqueo_edicion().
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/especies.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/producto.php';
require_once __DIR__ . '/../../funciones/edicion.php';

$userId = rh_require_auth($conn);

$productoId = (int) ($_POST['productoId'] ?? 0);
if ($productoId <= 0) {
    json_error('Falta productoId');
}

$sqlDetalle =
    'SELECT Producto.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM Producto JOIN Usuario ON Usuario.UserId = Producto.UserId
     WHERE Producto.ProductoId = ?';

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $productoId);
$stmt->execute();
$producto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$producto || $producto['Estado'] !== 'A') {
    json_error('Publicación no encontrada', 404);
}
if ((int) $producto['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta publicación', 403);
}

$lock = rh_producto_motivo_bloqueo_edicion($conn, $productoId);
if ($lock !== null) {
    json_error($lock, 409);
}

$categoriaId = (int) ($_POST['categoriaId'] ?? 0);
$nombre = trim($_POST['nombre'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$precio = isset($_POST['precio']) && $_POST['precio'] !== '' ? (float) $_POST['precio'] : null;
$cantidad = isset($_POST['cantidad']) && $_POST['cantidad'] !== '' ? (int) $_POST['cantidad'] : 1;
$especie = trim($_POST['especie'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) && $_POST['zonaLat'] !== '' ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) && $_POST['zonaLng'] !== '' ? (float) $_POST['zonaLng'] : null;

if ($nombre === '' || mb_strlen($nombre) > 150) {
    json_error('El nombre es obligatorio (máx 150 caracteres)');
}
if ($precio === null || $precio <= 0) {
    json_error('El precio debe ser mayor a 0');
}
if ($cantidad < 1) {
    json_error('La cantidad debe ser al menos 1');
}
if ($especie !== null && !in_array($especie, rh_especies_validas(), true)) {
    json_error("Especie no válida");
}
if ($zonaDescripcion === '' || mb_strlen($zonaDescripcion) > 150) {
    json_error('La zona es obligatoria (máx 150 caracteres)');
}
if ($zonaLat === null || $zonaLng === null) {
    json_error('Falta la ubicación de la publicación');
}

$stmt = $conn->prepare('SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE CategoriaId = ?');
$stmt->bind_param('i', $categoriaId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Categoría inválida');
}
$stmt->close();

$stmt = $conn->prepare(
    'UPDATE Producto
     SET CategoriaId = ?, Nombre = ?, Descripcion = ?, Precio = ?, Cantidad = ?, Especie = ?,
         ZonaDescripcion = ?, ZonaLat = ?, ZonaLng = ?
     WHERE ProductoId = ? AND UserId = ?'
);
$stmt->bind_param(
    'issdissddii',
    $categoriaId, $nombre, $descripcion, $precio, $cantidad, $especie,
    $zonaDescripcion, $zonaLat, $zonaLng, $productoId, $userId
);
$stmt->execute();
$stmt->close();

rh_sincronizar_fotos(
    $conn,
    'Producto',
    $productoId,
    $_POST['ordenFotos'] ?? null,
    $_FILES['fotos'] ?? null,
    'rh_guardar_foto_producto'
);

$stmt = $conn->prepare($sqlDetalle);
$stmt->bind_param('i', $productoId);
$stmt->execute();
$actualizado = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['producto' => rh_producto_publico($conn, $actualizado, $userId)], 'Publicación actualizada');
