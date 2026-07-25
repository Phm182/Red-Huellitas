<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/perdido.php';

$viewerUserId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;
$tipo = $_GET['tipo'] ?? '';

$sql = "SELECT Perdido.*,
               Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
               Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
               Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
               Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto, Mascota.DescripcionTexto AS MascotaDescripcion
        FROM Perdido
        JOIN Usuario ON Usuario.UserId = Perdido.UserId
        LEFT JOIN Mascota ON Mascota.MascotaId = Perdido.MascotaId
        WHERE Perdido.Estado = 'A' AND Perdido.EstadoPerdido = 'activo'";
$types = '';
$params = [];

if (in_array($tipo, ['perdido', 'encontrado'], true)) {
    $sql .= ' AND Perdido.Tipo = ?';
    $types .= 's';
    $params[] = $tipo;
}
if ($cursor !== null) {
    $sql .= ' AND Perdido.PerdidoId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY Perdido.PerdidoId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$reportes = [];
while ($row = $result->fetch_assoc()) {
    $reportes[] = rh_perdido_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($reportes) === $limit ? $reportes[count($reportes) - 1]['perdidoId'] : null;

json_success(['reportes' => $reportes, 'nextCursor' => $nextCursor]);
