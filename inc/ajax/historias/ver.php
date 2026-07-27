<?php
/**
 * Historias activas de un usuario puntual, orden cronológico — usado por el
 * visor al abrir las historias de un autor desde la barra.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/historias.php';
require_once __DIR__ . '/../../funciones/privacidad.php';

$viewerUserId = rh_require_auth($conn);

$userId = (int) ($_GET['userId'] ?? 0);
if ($userId <= 0) {
    json_error('Falta userId');
}

rh_require_ver_perfil($conn, $viewerUserId, $userId);

$stmt = $conn->prepare(
    "SELECT * FROM Historia WHERE UserId = ? AND Estado = 'A' AND ExpiraEn > NOW() ORDER BY CreatedAt ASC"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$historias = [];
while ($row = $result->fetch_assoc()) {
    $historias[] = rh_historia_publico($conn, $row, $viewerUserId);
}
$stmt->close();

json_success(['historias' => $historias]);
