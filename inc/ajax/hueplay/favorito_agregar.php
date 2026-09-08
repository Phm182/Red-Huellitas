<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_POST['juegoCodigo'] ?? '');
if (!rh_juego_existe($juegoCodigo)) {
    json_error('Juego desconocido');
}

$stmt = $conn->prepare(
    'INSERT INTO HuePlayFavorito (UserId, JuegoCodigo) VALUES (?, ?) ON DUPLICATE KEY UPDATE UserId = UserId'
);
$stmt->bind_param('is', $userId, $juegoCodigo);
$stmt->execute();
$stmt->close();

json_success(null, 'Agregado a favoritos');
