<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/match.php';

const RH_MATCH_RADIOS_VALIDOS = [20, 50, 100];

$userId = rh_require_auth($conn);

$mascotaIdOrigen = (int) ($_GET['mascotaIdOrigen'] ?? 0);
if ($mascotaIdOrigen <= 0) {
    json_error('Falta mascotaIdOrigen');
}

$stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaIdOrigen);
$stmt->execute();
$origen = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$origen) {
    json_error('Mascota no encontrada', 404);
}
if ((int) $origen['UserId'] !== $userId) {
    json_error('No tenés permiso para usar esta mascota', 403);
}
if (!$origen['DisponibleParaMatch'] || $origen['Estado'] !== 'A') {
    json_error('Esta mascota no está disponible para Match');
}

$stmt = $conn->prepare('SELECT ZonaLat, ZonaLng FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$viewer = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$viewer || $viewer['ZonaLat'] === null || $viewer['ZonaLng'] === null) {
    json_error('Necesitás tu zona registrada para usar Match');
}
$viewerLat = (float) $viewer['ZonaLat'];
$viewerLng = (float) $viewer['ZonaLng'];

$especie = $_GET['especie'] ?? '';
$sexo = $_GET['sexo'] ?? '';
$razaId = isset($_GET['razaId']) && $_GET['razaId'] !== '' ? (int) $_GET['razaId'] : null;
$edadMin = isset($_GET['edadMin']) && $_GET['edadMin'] !== '' ? (int) $_GET['edadMin'] : null;
$edadMax = isset($_GET['edadMax']) && $_GET['edadMax'] !== '' ? (int) $_GET['edadMax'] : null;
$radioKm = isset($_GET['radioKm']) && $_GET['radioKm'] !== '' ? (int) $_GET['radioKm'] : null;
if ($radioKm !== null && !in_array($radioKm, RH_MATCH_RADIOS_VALIDOS, true)) {
    json_error('radioKm debe ser 20, 50 o 100');
}

$sql = "SELECT Mascota.*,
            (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(Usuario.ZonaLat)) * COS(RADIANS(Usuario.ZonaLng) - RADIANS(?))
                + SIN(RADIANS(?)) * SIN(RADIANS(Usuario.ZonaLat))
            )) AS DistanciaKm
        FROM Mascota
        JOIN Usuario ON Usuario.UserId = Mascota.UserId
        JOIN UsuarioVerificacion ON UsuarioVerificacion.UserId = Mascota.UserId AND UsuarioVerificacion.EstadoRevision = 'aprobado'
        WHERE Mascota.Estado = 'A'
          AND Mascota.DisponibleParaMatch = 1
          AND Usuario.ZonaLat IS NOT NULL AND Usuario.ZonaLng IS NOT NULL
          AND Mascota.UserId != ?
          AND NOT EXISTS (
              SELECT 1 FROM MascotaMatchSwipe
              WHERE MascotaMatchSwipe.MascotaIdOrigen = ? AND MascotaMatchSwipe.MascotaIdDestino = Mascota.MascotaId
          )";
$types = 'dddii';
$params = [$viewerLat, $viewerLng, $viewerLat, $userId, $mascotaIdOrigen];

if (in_array($especie, ['perro', 'gato', 'otro'], true)) {
    $sql .= ' AND Mascota.Especie = ?';
    $types .= 's';
    $params[] = $especie;
}
if (in_array($sexo, ['macho', 'hembra'], true)) {
    $sql .= ' AND Mascota.Sexo = ?';
    $types .= 's';
    $params[] = $sexo;
}
if ($razaId !== null) {
    $sql .= ' AND Mascota.RazaId = ?';
    $types .= 'i';
    $params[] = $razaId;
}
if ($edadMin !== null) {
    $sql .= ' AND Mascota.EdadAnios IS NOT NULL AND Mascota.EdadAnios >= ?';
    $types .= 'i';
    $params[] = $edadMin;
}
if ($edadMax !== null) {
    $sql .= ' AND Mascota.EdadAnios IS NOT NULL AND Mascota.EdadAnios <= ?';
    $types .= 'i';
    $params[] = $edadMax;
}

if ($radioKm !== null) {
    $sql .= ' HAVING DistanciaKm <= ?';
    $types .= 'd';
    $params[] = $radioKm;
}
$sql .= ' ORDER BY DistanciaKm ASC LIMIT 20';

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$candidatos = [];
while ($row = $result->fetch_assoc()) {
    $candidatos[] = rh_match_candidato_publico($conn, $row, $userId, (float) $row['DistanciaKm']);
}
$stmt->close();

json_success(['candidatos' => $candidatos]);
