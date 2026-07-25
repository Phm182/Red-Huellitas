<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania.php';

$viewerUserId = rh_require_auth($conn);

$campaniaId = (int) ($_GET['campaniaId'] ?? 0);
if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}

$stmt = $conn->prepare(
    "SELECT Campania.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM Campania JOIN Usuario ON Usuario.UserId = Campania.UserId
     WHERE Campania.CampaniaId = ?"
);
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania || $campania['Estado'] !== 'A') {
    json_error('Campaña no encontrada', 404);
}

json_success(['campania' => rh_campania_publico($conn, $campania, $viewerUserId)]);
