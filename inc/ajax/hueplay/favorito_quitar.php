<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_POST['juegoCodigo'] ?? '');
if ($juegoCodigo === '') {
    json_error('Falta juegoCodigo');
}

$stmt = $conn->prepare('DELETE FROM HuePlayFavorito WHERE UserId = ? AND JuegoCodigo = ?');
$stmt->bind_param('is', $userId, $juegoCodigo);
$stmt->execute();
$stmt->close();

json_success(null, 'Quitado de favoritos');
