<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$productoId = (int) ($_POST['productoId'] ?? 0);
if ($productoId <= 0) {
    json_error('Falta productoId');
}

$stmt = $conn->prepare('DELETE FROM ProductoFavorito WHERE ProductoId = ? AND UserId = ?');
$stmt->bind_param('ii', $productoId, $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Quitado de favoritos');
