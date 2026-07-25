<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/perdido.php';

$viewerUserId = rh_require_auth($conn);

$perdidoId = (int) ($_GET['perdidoId'] ?? 0);
if ($perdidoId <= 0) {
    json_error('Falta perdidoId');
}

$stmt = $conn->prepare(
    "SELECT Perdido.*,
            Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
            Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
            Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto, Mascota.DescripcionTexto AS MascotaDescripcion
     FROM Perdido
     JOIN Usuario ON Usuario.UserId = Perdido.UserId
     LEFT JOIN Mascota ON Mascota.MascotaId = Perdido.MascotaId
     WHERE Perdido.PerdidoId = ?"
);
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$perdido = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$perdido || $perdido['Estado'] !== 'A') {
    json_error('Reporte no encontrado', 404);
}

json_success(['perdido' => rh_perdido_publico($conn, $perdido, $viewerUserId)]);
