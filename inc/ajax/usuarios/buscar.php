<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';

$viewerUserId = rh_require_auth($conn);

$q = trim($_GET['q'] ?? '');
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 20;

if (mb_strlen($q) < 2) {
    json_success(['usuarios' => [], 'mascotas' => []]);
}

$like = '%' . $q . '%';

$stmt = $conn->prepare(
    "SELECT * FROM Usuario
     WHERE Estado = 'A' AND EsBot = 0 AND (Username LIKE ? OR NombreCompleto LIKE ?)
     ORDER BY Username ASC LIMIT ?"
);
$stmt->bind_param('ssi', $like, $like, $limit);
$stmt->execute();
$result = $stmt->get_result();
$usuarios = [];
while ($row = $result->fetch_assoc()) {
    $usuarios[] = rh_usuario_resumen($row);
}
$stmt->close();

$stmt = $conn->prepare(
    "SELECT Mascota.* FROM Mascota
     LEFT JOIN RazaCatalogo ON RazaCatalogo.RazaId = Mascota.RazaId
     WHERE Mascota.Estado = 'A'
       AND (Mascota.Nombre LIKE ? OR Mascota.RazaTexto LIKE ? OR RazaCatalogo.Nombre LIKE ? OR Mascota.Especie LIKE ?)
     ORDER BY Mascota.CreatedAt DESC LIMIT ?"
);
$stmt->bind_param('ssssi', $like, $like, $like, $like, $limit);
$stmt->execute();
$result = $stmt->get_result();
$mascotas = [];
while ($row = $result->fetch_assoc()) {
    $mascotas[] = rh_mascota_publica($conn, $row, $viewerUserId, false);
}
$stmt->close();

json_success(['usuarios' => $usuarios, 'mascotas' => $mascotas]);
