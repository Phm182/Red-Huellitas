<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    "SELECT Adopcion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad, Usuario.ZonaDescripcion
     FROM AdopcionFavorito
     JOIN Adopcion ON Adopcion.AdopcionId = AdopcionFavorito.AdopcionId
     JOIN Usuario ON Usuario.UserId = Adopcion.UserId
     WHERE AdopcionFavorito.UserId = ? AND Adopcion.Estado = 'A'
     ORDER BY AdopcionFavorito.CreatedAt DESC"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$favoritos = [];
while ($row = $result->fetch_assoc()) {
    $favoritos[] = rh_adopcion_publico($conn, $row, $userId);
}
$stmt->close();

json_success(['favoritos' => $favoritos]);
