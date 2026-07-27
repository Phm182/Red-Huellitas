<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/privacidad.php';

$viewerUserId = rh_require_auth($conn);

$userId = (int) ($_GET['userId'] ?? 0);
if ($userId <= 0) {
    json_error('Falta userId');
}

// Quién te sigue también es contenido de la cuenta: en una privada esa lista
// no se muestra a cualquiera.
rh_require_ver_perfil($conn, $viewerUserId, $userId);

$stmt = $conn->prepare(
    "SELECT Usuario.* FROM Seguimiento
     JOIN Usuario ON Usuario.UserId = Seguimiento.UserIdSeguidor
     WHERE Seguimiento.UserIdSeguido = ? AND Usuario.Estado = 'A'
     ORDER BY Seguimiento.CreatedAt DESC"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$usuarios = [];
while ($row = $result->fetch_assoc()) {
    $usuarios[] = rh_usuario_resumen($row);
}
$stmt->close();

json_success(['usuarios' => $usuarios]);
