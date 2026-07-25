<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/transito.php';

$viewerUserId = rh_require_auth($conn);

$transitoId = (int) ($_GET['transitoId'] ?? 0);
if ($transitoId <= 0) {
    json_error('Falta transitoId');
}

$stmt = $conn->prepare(
    "SELECT Transito.*,
            Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
            Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
            Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto, Mascota.DescripcionTexto AS MascotaDescripcion
     FROM Transito
     JOIN Usuario ON Usuario.UserId = Transito.UserId
     LEFT JOIN Mascota ON Mascota.MascotaId = Transito.MascotaId
     WHERE Transito.TransitoId = ?"
);
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$transito || $transito['Estado'] !== 'A') {
    json_error('Publicación de tránsito no encontrada', 404);
}

json_success(['transito' => rh_transito_publico($conn, $transito, $viewerUserId)]);
