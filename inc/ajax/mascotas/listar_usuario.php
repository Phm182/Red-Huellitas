<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$viewerUserId = rh_require_auth($conn);

$targetUserId = (int) ($_GET['userId'] ?? 0);
if ($targetUserId <= 0) {
    json_error('Falta userId');
}

$stmt = $conn->prepare(
    "SELECT * FROM Mascota WHERE UserId = ? AND Estado = 'A' ORDER BY CreatedAt DESC"
);
$stmt->bind_param('i', $targetUserId);
$stmt->execute();
$result = $stmt->get_result();

$mascotas = [];
while ($row = $result->fetch_assoc()) {
    $mascotas[] = rh_mascota_publica($conn, $row, $viewerUserId);
}
$stmt->close();

json_success(['mascotas' => $mascotas]);
