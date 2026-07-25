<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/donacion.php';

$viewerUserId = rh_require_auth($conn);

$donacionId = (int) ($_GET['donacionId'] ?? 0);
if ($donacionId <= 0) {
    json_error('Falta donacionId');
}

$stmt = $conn->prepare(
    "SELECT Donacion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad
     FROM Donacion JOIN Usuario ON Usuario.UserId = Donacion.UserId
     WHERE Donacion.DonacionId = ?"
);
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$donacion || $donacion['Estado'] !== 'A') {
    json_error('Publicación de donación no encontrada', 404);
}

json_success(['donacion' => rh_donacion_publico($conn, $donacion, $viewerUserId)]);
