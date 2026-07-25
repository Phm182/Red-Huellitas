<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/veterinaria.php';

$viewerUserId = rh_require_auth($conn);

$veterinariaId = (int) ($_GET['veterinariaId'] ?? 0);
if ($veterinariaId <= 0) {
    json_error('Falta veterinariaId');
}

$stmt = $conn->prepare('SELECT * FROM Veterinaria WHERE VeterinariaId = ?');
$stmt->bind_param('i', $veterinariaId);
$stmt->execute();
$veterinaria = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$veterinaria || $veterinaria['Estado'] !== 'A') {
    json_error('Veterinaria no encontrada', 404);
}

json_success(['veterinaria' => rh_veterinaria_publico($conn, $veterinaria, $viewerUserId)]);
