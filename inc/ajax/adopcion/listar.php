<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$viewerUserId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;
$especie = $_GET['especie'] ?? '';

$sql = "SELECT Adopcion.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
               Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad, Usuario.ZonaDescripcion
        FROM Adopcion JOIN Usuario ON Usuario.UserId = Adopcion.UserId
        WHERE Adopcion.Estado = 'A'";
$types = '';
$params = [];

if (in_array($especie, ['perro', 'gato', 'otro'], true)) {
    $sql .= ' AND Adopcion.Especie = ?';
    $types .= 's';
    $params[] = $especie;
}
if ($cursor !== null) {
    $sql .= ' AND Adopcion.AdopcionId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY Adopcion.AdopcionId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$listados = [];
while ($row = $result->fetch_assoc()) {
    $listados[] = rh_adopcion_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($listados) === $limit ? $listados[count($listados) - 1]['adopcionId'] : null;

json_success(['listados' => $listados, 'nextCursor' => $nextCursor]);
