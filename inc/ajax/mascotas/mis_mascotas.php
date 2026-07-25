<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    "SELECT * FROM Mascota WHERE UserId = ? AND Estado = 'A' ORDER BY CreatedAt DESC"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$mascotas = [];
while ($row = $result->fetch_assoc()) {
    $mascotas[] = rh_mascota_publica($conn, $row, $userId);
}
$stmt->close();

json_success(['mascotas' => $mascotas]);
