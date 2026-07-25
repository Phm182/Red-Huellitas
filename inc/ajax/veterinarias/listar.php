<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/veterinaria.php';

const RH_VETERINARIA_RADIOS_VALIDOS = [20, 50, 100];

$viewerUserId = rh_require_auth($conn);

$radioKm = isset($_GET['radioKm']) && $_GET['radioKm'] !== '' ? (int) $_GET['radioKm'] : null;
if ($radioKm !== null && !in_array($radioKm, RH_VETERINARIA_RADIOS_VALIDOS, true)) {
    json_error('radioKm debe ser 20, 50 o 100');
}

if ($radioKm !== null) {
    $stmt = $conn->prepare('SELECT ZonaLat, ZonaLng FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $viewerUserId);
    $stmt->execute();
    $viewer = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$viewer || $viewer['ZonaLat'] === null || $viewer['ZonaLng'] === null) {
        json_error('Necesitás tu zona registrada para filtrar por cercanía');
    }
    $viewerLat = (float) $viewer['ZonaLat'];
    $viewerLng = (float) $viewer['ZonaLng'];

    $sql = "SELECT Veterinaria.*,
                (6371 * ACOS(
                    COS(RADIANS(?)) * COS(RADIANS(Veterinaria.ZonaLat)) * COS(RADIANS(Veterinaria.ZonaLng) - RADIANS(?))
                    + SIN(RADIANS(?)) * SIN(RADIANS(Veterinaria.ZonaLat))
                )) AS DistanciaKm
            FROM Veterinaria
            WHERE Veterinaria.Estado = 'A'
            HAVING DistanciaKm <= ?
            ORDER BY DistanciaKm ASC LIMIT 50";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('dddd', $viewerLat, $viewerLng, $viewerLat, $radioKm);
    $stmt->execute();
    $result = $stmt->get_result();

    $listados = [];
    while ($row = $result->fetch_assoc()) {
        $listados[] = rh_veterinaria_publico($conn, $row, $viewerUserId, (float) $row['DistanciaKm']);
    }
    $stmt->close();

    json_success(['listados' => $listados, 'nextCursor' => null]);
}

// Sin radioKm ("Todos"): cronológico de siempre, con cursor.
$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

$sql = "SELECT * FROM Veterinaria WHERE Estado = 'A'";
$types = '';
$params = [];

if ($cursor !== null) {
    $sql .= ' AND VeterinariaId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY VeterinariaId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$listados = [];
while ($row = $result->fetch_assoc()) {
    $listados[] = rh_veterinaria_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$nextCursor = count($listados) === $limit ? $listados[count($listados) - 1]['veterinariaId'] : null;

json_success(['listados' => $listados, 'nextCursor' => $nextCursor]);
