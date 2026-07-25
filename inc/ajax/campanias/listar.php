<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania.php';

$viewerUserId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;
$tipo = $_GET['tipo'] ?? '';

$sql = "SELECT Campania.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
        FROM Campania JOIN Usuario ON Usuario.UserId = Campania.UserId
        WHERE Campania.Estado = 'A'";
$types = '';
$params = [];

if (in_array($tipo, ['castracion', 'vacunacion'], true)) {
    $sql .= ' AND Campania.Tipo = ?';
    $types .= 's';
    $params[] = $tipo;
}
if ($cursor !== null) {
    $sql .= ' AND Campania.CampaniaId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY Campania.CampaniaId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$campanias = [];
while ($row = $result->fetch_assoc()) {
    $campanias[] = rh_campania_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($campanias) === $limit ? $campanias[count($campanias) - 1]['campaniaId'] : null;

json_success(['campanias' => $campanias, 'nextCursor' => $nextCursor]);
