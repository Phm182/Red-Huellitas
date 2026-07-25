<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$usuario = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['suscripcion' => rh_suscripcion_publica($conn, $usuario)]);
