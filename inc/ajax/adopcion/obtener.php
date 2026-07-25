<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$viewerUserId = rh_require_auth($conn);

$adopcionId = (int) ($_GET['adopcionId'] ?? 0);
if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}

$stmt = $conn->prepare(
    "SELECT Adopcion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad, Usuario.ZonaDescripcion
     FROM Adopcion JOIN Usuario ON Usuario.UserId = Adopcion.UserId
     WHERE Adopcion.AdopcionId = ?"
);
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$adopcion || $adopcion['Estado'] !== 'A') {
    json_error('Publicación de adopción no encontrada', 404);
}

json_success(['adopcion' => rh_adopcion_publico($conn, $adopcion, $viewerUserId, true)]);
