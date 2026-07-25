<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/producto.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar', 403);
}

$tipoListado = $_POST['tipoListado'] ?? '';
$categoriaId = (int) ($_POST['categoriaId'] ?? 0);
$nombre = trim($_POST['nombre'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$precio = isset($_POST['precio']) ? (float) $_POST['precio'] : null;
$cantidad = isset($_POST['cantidad']) && $_POST['cantidad'] !== '' ? (int) $_POST['cantidad'] : 1;
$especie = trim($_POST['especie'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
$zonaLat = isset($_POST['zonaLat']) ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) ? (float) $_POST['zonaLng'] : null;

if (!in_array($tipoListado, ['producto', 'servicio'], true)) {
    json_error("tipoListado debe ser 'producto' o 'servicio'");
}
if ($nombre === '' || mb_strlen($nombre) > 150) {
    json_error('El nombre es obligatorio (máx 150 caracteres)');
}
if ($precio === null || $precio <= 0) {
    json_error('El precio debe ser mayor a 0');
}
if ($cantidad < 1) {
    json_error('La cantidad debe ser al menos 1');
}
if ($especie !== null && !in_array($especie, ['perro', 'gato', 'otro'], true)) {
    json_error("La especie debe ser 'perro', 'gato' u 'otro'");
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

$fotos = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
if (count($fotos) > 6) {
    json_error('Máximo 6 fotos por publicación');
}
foreach ($fotos as $foto) {
    $error = rh_validar_imagen_subida($foto);
    if ($error) {
        json_error("Foto inválida: $error");
    }
}

$stmt = $conn->prepare(
    'INSERT INTO Producto (UserId, TipoListado, CategoriaId, Nombre, Descripcion, Precio, Cantidad, Especie, ZonaDescripcion, ZonaLat, ZonaLng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'isissdissdd',
    $userId,
    $tipoListado,
    $categoriaId,
    $nombre,
    $descripcion,
    $precio,
    $cantidad,
    $especie,
    $zonaDescripcion,
    $zonaLat,
    $zonaLng
);
$stmt->execute();
$productoId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_producto($foto, $productoId);
    $stmt = $conn->prepare('INSERT INTO ProductoFoto (ProductoId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $productoId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare(
    'SELECT Producto.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM Producto JOIN Usuario ON Usuario.UserId = Producto.UserId
     WHERE Producto.ProductoId = ?'
);
$stmt->bind_param('i', $productoId);
$stmt->execute();
$producto = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['producto' => rh_producto_publico($conn, $producto, $userId)], 'Publicación creada', 201);
