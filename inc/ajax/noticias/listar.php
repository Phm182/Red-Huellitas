<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/noticias.php';

rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 20;

$sql = "SELECT * FROM NoticiaExterna WHERE Estado = 'A'";
$types = '';
$params = [];
if ($cursor !== null) {
    $sql .= ' AND NoticiaExternaId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY NoticiaExternaId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$noticias = [];
while ($row = $result->fetch_assoc()) {
    $noticias[] = rh_noticia_publico($row);
}
$stmt->close();

$nextCursor = count($noticias) === $limit ? $noticias[count($noticias) - 1]['noticiaExternaId'] : null;

json_success(['noticias' => $noticias, 'nextCursor' => $nextCursor]);
